
import React, { useState } from 'react';
import { ReceiptData, ReceiptItem } from '../types';

interface ReceiptReviewProps {
  data: ReceiptData;
  onConfirm: (updatedData: ReceiptData) => void;
  onCancel: () => void;
}

const CATEGORIES = [
  { name: 'Dining', icon: 'fa-utensils', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { name: 'Groceries', icon: 'fa-basket-shopping', color: 'bg-green-100 text-green-700 border-green-200' },
  { name: 'Travel', icon: 'fa-plane', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { name: 'Shopping', icon: 'fa-bag-shopping', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { name: 'Utilities', icon: 'fa-bolt', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { name: 'Health', icon: 'fa-heart-pulse', color: 'bg-red-100 text-red-700 border-red-200' },
  { name: 'Entertainment', icon: 'fa-clapperboard', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { name: 'Services', icon: 'fa-gears', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { name: 'Other', icon: 'fa-ellipsis', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

const ReceiptReview: React.FC<ReceiptReviewProps> = ({ data, onConfirm, onCancel }) => {
  const [editedData, setEditedData] = useState<ReceiptData>(data);

  const updateItem = (index: number, field: keyof ReceiptItem, value: any) => {
    const newItems = [...editedData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditedData({ ...editedData, items: newItems });
  };

  const handleConfirm = () => {
    onConfirm(editedData);
  };

  const currentCategory = CATEGORIES.find(c => c.name === editedData.category) || CATEGORIES[CATEGORIES.length - 1];

  return (
    <div className="max-w-2xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Review & Verify</h2>
            <p className="text-sm text-slate-500 font-medium">Auto-categorized by Gemini AI</p>
          </div>
          <div className={`px-4 py-2 rounded-full border text-sm font-bold flex items-center gap-2 ${currentCategory.color}`}>
            <i className={`fa-solid ${currentCategory.icon}`}></i>
            {editedData.category}
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Merchant Name</label>
              <div className="relative">
                <i className="fa-solid fa-shop absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"></i>
                <input 
                  type="text" 
                  value={editedData.merchantName}
                  onChange={(e) => setEditedData({...editedData, merchantName: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Transaction Category</label>
              <select 
                value={editedData.category}
                onChange={(e) => setEditedData({...editedData, category: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.name} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Itemized Breakdown</label>
              <span className="text-[10px] font-bold text-slate-300">{editedData.items.length} Items</span>
            </div>
            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-2 max-h-72 overflow-y-auto scrollbar-hide">
              {editedData.items.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-center p-2 group border-b border-slate-100 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover:border-blue-200 group-hover:text-blue-500 transition-colors">
                    {idx + 1}
                  </div>
                  <input 
                    type="text" 
                    value={item.name}
                    onChange={(e) => updateItem(idx, 'name', e.target.value)}
                    className="flex-1 bg-transparent border-0 focus:ring-0 text-sm font-semibold text-slate-600 placeholder:text-slate-300"
                    placeholder="Item name"
                  />
                  <div className="w-24 relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{editedData.currency || '$'}</span>
                    <input 
                      type="number" 
                      value={item.price}
                      onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value))}
                      className="w-full pl-6 pr-2 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 text-right focus:border-blue-400 outline-none transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Grand Total</span>
              <p className="text-xs text-blue-600/60 font-medium">Incl. taxes & fees</p>
            </div>
            <div className="text-3xl font-black text-blue-600 tracking-tight">
              {editedData.currency || '$'}{editedData.totalAmount.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row gap-4">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 px-6 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-arrow-left"></i>
            Back
          </button>
          <button 
            onClick={handleConfirm}
            className="flex-[2] py-4 px-6 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <i className="fa-solid fa-cloud-arrow-up text-lg"></i>
            Export to Spreadsheet
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptReview;
