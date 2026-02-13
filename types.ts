
export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

export interface ReceiptData {
  merchantName: string;
  date: string;
  totalAmount: number;
  currency: string;
  items: ReceiptItem[];
  category: string;
}

export enum AppState {
  IDLE = 'IDLE',
  CAPTURING = 'CAPTURING',
  SCANNING = 'SCANNING',
  REVIEWING = 'REVIEWING',
  EXPORTING = 'EXPORTING',
  SUCCESS = 'SUCCESS'
}
