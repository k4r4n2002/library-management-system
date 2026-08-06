export type CopyStatus = "available" | "borrowed" | "retired";

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  cover_url: string | null;
  created_at: string;
  copy_count: number;
  available_count: number;
}

export interface BookCopy {
  id: string;
  book_id: string;
  qr_code: string;
  status: CopyStatus;
  added_at: string;
}

export interface BookDetail {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  cover_url: string | null;
  created_at: string;
  copies: BookCopy[];
}

export interface Member {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export interface Loan {
  id: string;
  book_copy_id: string;
  member_id: string;
  duration_days: number;
  borrowed_at: string;
  due_at: string;
  returned_at: string | null;
  title?: string;
  author?: string;
  qr_code?: string;
  member_name?: string;
  member_phone?: string | null;
  is_overdue?: boolean;
}

export interface ScanLog {
  id: string;
  event_type: "book_ingest" | "lend" | "return" | "unresolved";
  scanned_code: string;
  book_copy_id: string | null;
  loan_id: string | null;
  raw_payload: unknown;
  scanned_at: string;
  title?: string;
  qr_code?: string;
}

export interface DashboardSummary {
  totalBooks: number;
  totalCopies: number;
  activeLoans: number;
  dueSoon: number;
  overdue: number;
}

export interface ResolveResult {
  copy: { id: string; qrCode: string; status: CopyStatus };
  book: { id: string; title: string; author: string; coverUrl: string | null };
  activeLoan: (Loan & { member_name: string; member_phone: string | null }) | null;
}
