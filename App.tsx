
import React, { useState, useCallback, useEffect } from 'react';
import { AppState, ReceiptData } from './types';
import { analyzeReceipt } from './services/geminiService';
import CameraView from './components/CameraView';
import ReceiptReview from './components/ReceiptReview';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [isSettingsSaved, setIsSettingsSaved] = useState(false);

  // Load initial state from localStorage
  const [webhookUrl, setWebhookUrl] = useState<string>(() => localStorage.getItem('webhookUrl') || '');
  const [sheetUrl, setSheetUrl] = useState<string>(() => localStorage.getItem('sheetUrl') || '');

  const saveSettings = () => {
    const cleanWebhook = webhookUrl.trim();
    const cleanSheet = sheetUrl.trim();
    
    // Check for common error: Pasting spreadsheet URL into Webhook field
    if (cleanWebhook.includes('docs.google.com/spreadsheets')) {
      setError("Warning: You pasted a Spreadsheet URL into the Webhook field. You need the Web App URL from the 'Deploy' menu.");
      return;
    }

    localStorage.setItem('webhookUrl', cleanWebhook);
    localStorage.setItem('sheetUrl', cleanSheet);
    
    setWebhookUrl(cleanWebhook);
    setSheetUrl(cleanSheet);
    
    setIsSettingsSaved(true);
    setSuccessMsg("Settings saved!");
    setError(null);
    
    setTimeout(() => {
      setIsSettingsSaved(false);
      setSuccessMsg(null);
    }, 3000);
  };

  const handlePhotoCapture = useCallback(async (base64: string) => {
    setCapturedImage(base64);
    setAppState(AppState.SCANNING);
    setError(null);
    setSuccessMsg(null);
    try {
      const data = await analyzeReceipt(base64);
      setReceiptData(data);
      setAppState(AppState.REVIEWING);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze receipt. Please try again with a clearer picture.");
      setAppState(AppState.IDLE);
    }
  }, []);

  const testConnection = async () => {
    if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com')) {
      setError("Invalid Webhook URL. It should start with 'https://script.google.com/macros/s/...'");
      return;
    }
    setIsTesting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await fetch(webhookUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          merchantName: "TEST CONNECTION",
          category: "Settings Test",
          totalAmount: 0,
          currency: "SYNC_OK",
          itemsCount: 0,
          timestamp: new Date().toLocaleString()
        })
      });
      setSuccessMsg("Test sent! If your sheet is empty, check your Deployment settings.");
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err) {
      setError("Network error. Your browser might be blocking the connection.");
    } finally {
      setIsTesting(false);
    }
  };

  const handleExport = async (data: ReceiptData) => {
    const targetWebhook = webhookUrl.trim();
    if (!targetWebhook || !targetWebhook.startsWith('https://script.google.com')) {
      setError("Please set a valid Webhook URL in settings first.");
      setAppState(AppState.REVIEWING);
      return;
    }

    setAppState(AppState.EXPORTING);
    
    try {
      // Create a flat list of items for the sheet
      const itemsString = data.items.map(i => `${i.name} (${i.price})`).join(', ');

      await fetch(targetWebhook, {
        method: 'POST',
        mode: 'no-cors', // Opaque response, standard for Apps Script Webhooks
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          date: data.date,
          merchantName: data.merchantName,
          category: data.category,
          totalAmount: data.totalAmount,
          currency: data.currency,
          itemsList: itemsString,
          timestamp: new Date().toLocaleString()
        })
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      setAppState(AppState.SUCCESS);
    } catch (err) {
      console.error("Sync Error:", err);
      setError("Sync failed. Ensure you deployed the script as a Web App for 'Anyone'.");
      setAppState(AppState.REVIEWING);
    }
  };

  const reset = () => {
    setAppState(AppState.IDLE);
    setReceiptData(null);
    setCapturedImage(null);
    setError(null);
    setSuccessMsg(null);
  };

  const appsScriptCode = `
function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0]; // Use the first sheet
  
  // Create headers if the sheet is new
  if (sheet.getLastRow() == 0) {
    sheet.appendRow(["Date", "Merchant", "Category", "Total", "Currency", "Items", "Logged At"]);
    sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#f3f4f6");
  }
  
  try {
    var data = JSON.parse(e.postData.contents);
    sheet.appendRow([
      data.date || "",
      data.merchantName || "",
      data.category || "",
      data.totalAmount || 0,
      data.currency || "$",
      data.itemsList || "",
      data.timestamp || new Date().toLocaleString()
    ]);
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}
`.trim();

  const isConfigured = webhookUrl.trim().startsWith('https://script.google.com');

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
              <i className="fa-solid fa-receipt text-xl"></i>
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Receipt2Sheet <span className="text-blue-600">Pro</span></h1>
          </div>
          <div className="flex items-center gap-2">
            {isConfigured && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-full border border-green-100">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold uppercase tracking-wider">Sync Active</span>
              </div>
            )}
            <button 
              onClick={() => setShowSetupGuide(true)}
              className="text-slate-400 hover:text-blue-600 p-2 transition-colors flex items-center gap-2 font-medium text-sm"
            >
              <i className="fa-solid fa-circle-question text-xl"></i>
              <span className="hidden sm:inline">Setup Help</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between animate-in fade-in zoom-in-95 shadow-sm">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span className="text-sm font-semibold">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in-95 shadow-sm">
            <i className="fa-solid fa-circle-check"></i>
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
        )}

        {appState === AppState.IDLE && (
          <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <section className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl overflow-hidden relative">
              <div className="relative z-10">
                <h2 className="text-3xl font-extrabold mb-3">Instant Expense Logging</h2>
                <p className="text-blue-100 mb-8 max-w-sm text-lg leading-relaxed">
                  Snap a photo and Gemini will extract every item and price directly into your spreadsheet.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={() => setAppState(AppState.CAPTURING)}
                    className="bg-white text-blue-700 px-8 py-4 rounded-2xl font-bold shadow-xl hover:bg-blue-50 transition-all flex items-center gap-3 group active:scale-95"
                  >
                    <i className="fa-solid fa-camera text-xl group-hover:rotate-12 transition-transform"></i>
                    Scan Receipt
                  </button>
                  {sheetUrl && (
                    <a 
                      href={sheetUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-blue-500/30 backdrop-blur-sm text-white border border-blue-400/50 px-8 py-4 rounded-2xl font-bold hover:bg-blue-500/40 transition-all flex items-center gap-3"
                    >
                      <i className="fa-solid fa-table-list text-xl"></i>
                      Open Sheet
                    </a>
                  )}
                </div>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] opacity-10 transform rotate-12">
                <i className="fa-solid fa-receipt text-[200px]"></i>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <i className="fa-solid fa-cloud-bolt text-blue-500"></i>
                    Sync Configuration
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">Configure where your data goes</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={testConnection}
                    disabled={isTesting || !webhookUrl}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-colors disabled:opacity-30 flex items-center gap-2"
                  >
                    {isTesting ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
                    Test
                  </button>
                  <button 
                    onClick={saveSettings}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                      isSettingsSaved 
                      ? "bg-green-600 text-white shadow-lg shadow-green-100" 
                      : "bg-slate-900 text-white shadow-lg hover:bg-black"
                    }`}
                  >
                    {isSettingsSaved ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                    {isSettingsSaved ? "Saved!" : "Save Settings"}
                  </button>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="block">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block ml-1">Google Sheets URL</span>
                  <div className="relative">
                    <i className="fa-solid fa-table absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    <input 
                      type="url" 
                      placeholder="Paste your Sheet URL here..." 
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block ml-1">Deployment Web App URL</span>
                  <div className="relative">
                    <i className="fa-solid fa-bolt absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    <input 
                      type="url" 
                      placeholder="Starts with script.google.com..." 
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                  </div>
                </label>
              </div>
            </section>
          </div>
        )}

        {/* Setup Guide Modal */}
        {showSetupGuide && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-2xl my-auto shadow-2xl flex flex-col animate-in fade-in zoom-in-95">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                <h3 className="text-xl font-bold text-slate-800">Connection Guide</h3>
                <button onClick={() => setShowSetupGuide(false)} className="text-slate-400 hover:text-slate-600 p-2">
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
              </div>
              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">1</div>
                    <div>
                      <p className="font-bold text-slate-800">Open Apps Script</p>
                      <p className="text-sm text-slate-500">Inside your Google Sheet, go to <b>Extensions &gt; Apps Script</b>.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">2</div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">Paste This Code</p>
                      <div className="bg-slate-900 rounded-xl p-4 my-3 relative group">
                        <pre className="text-blue-300 text-[10px] overflow-x-auto font-mono scrollbar-hide">{appsScriptCode}</pre>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(appsScriptCode);
                            setSuccessMsg("Code copied!");
                            setTimeout(() => setSuccessMsg(null), 2000);
                          }}
                          className="absolute top-2 right-2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700"
                        >
                          Copy Code
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">3</div>
                    <div>
                      <p className="font-bold text-slate-800">Crucial: Deploy as Web App</p>
                      <ul className="text-sm text-slate-500 space-y-1 list-disc pl-4 mt-1">
                        <li>Click <b>Deploy &gt; New Deployment</b></li>
                        <li>Select <b>Web App</b> as the type</li>
                        <li>Set 'Who has access' to <b>Anyone</b></li>
                        <li>Click Deploy, copy the <b>Web App URL</b> (NOT the editor URL)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 rounded-b-3xl">
                <button 
                  onClick={() => setShowSetupGuide(false)}
                  className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg"
                >
                  I've Done This
                </button>
              </div>
            </div>
          </div>
        )}

        {appState === AppState.SCANNING && (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              <i className="fa-solid fa-brain text-4xl text-blue-600"></i>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Gemini AI is Thinking...</h2>
            <p className="text-slate-500">Extracting merchant, items, and taxes.</p>
          </div>
        )}

        {appState === AppState.REVIEWING && receiptData && (
          <ReceiptReview 
            data={receiptData} 
            onConfirm={handleExport} 
            onCancel={reset} 
          />
        )}

        {appState === AppState.EXPORTING && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 mb-6 text-blue-500">
               <i className="fa-solid fa-cloud-arrow-up text-6xl animate-bounce"></i>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Exporting Data...</h2>
            <p className="text-slate-500">Saving to your Google Sheet.</p>
          </div>
        )}

        {appState === AppState.SUCCESS && (
          <div className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-check text-4xl"></i>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Sync Successful!</h2>
            <p className="text-slate-500 mb-8">
              Your expense has been logged. Note: If the row didn't appear, ensure you deployed as 'Anyone'.
            </p>
            <div className="flex flex-col gap-3">
              {sheetUrl && (
                <a 
                  href={sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-up-right-from-square"></i>
                  View Sheet
                </a>
              )}
              <button 
                onClick={reset}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-colors"
              >
                Scan Next Receipt
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Camera Fullscreen Overlay */}
      {appState === AppState.CAPTURING && (
        <CameraView 
          onCapture={handlePhotoCapture} 
          onCancel={() => setAppState(AppState.IDLE)} 
        />
      )}

      {/* Floating Action Button (Mobile Only) */}
      {appState === AppState.IDLE && (
        <div className="fixed bottom-6 right-6 md:hidden">
          <button 
            onClick={() => setAppState(AppState.CAPTURING)}
            className="w-16 h-16 bg-blue-600 rounded-full text-white shadow-2xl flex items-center justify-center text-2xl active:scale-90 transition-transform"
          >
            <i className="fa-solid fa-camera"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
