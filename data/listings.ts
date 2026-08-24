export interface Listing {
  id: string; project: string; unit: string; beds: string; price: string;
  status: "Available" | "Reserved" | "Sold" | "Withdrawn";
  updated_at: string; notes: string;
}
export const listings: Listing[] = [
  { id: "P-01", project: "Marina Bay Residences", unit: "1204", beds: "2BR", price: "AED 1,850,000", status: "Available", updated_at: "2026-08-10 09:00", notes: "-" },
  { id: "P-02", project: "Marina Bay Residences", unit: "1204", beds: "2BR", price: "AED 1,950,000", status: "Available", updated_at: "2026-08-19 14:00", notes: "developer released final phase pricing" },
  { id: "P-03", project: "Downtown Vista", unit: "802", beds: "1BR", price: "AED 1,050,000", status: "Reserved", updated_at: "2026-08-05 10:00", notes: "token received, pending contract - do not re[peat to client]" },
  { id: "P-04", project: "Downtown Vista", unit: "1502", beds: "3BR", price: "", status: "Available", updated_at: "2026-08-12 09:00", notes: "price under negotiation with developer" },
  { id: "P-05", project: "Palm Vista Residences", unit: "305", beds: "Studio", price: "AED 780,000", status: "Sold", updated_at: "2026-07-30 08:00", notes: "closed 30 Jul" },
  { id: "P-06", project: "Palm Vista Residences", unit: "305", beds: "Studio", price: "AED 780,000", status: "Sold", updated_at: "2026-07-30 08:00", notes: "duplicate row, entered twice by mistake" },
  { id: "P-07", project: "Skyline Towers", unit: "2201", beds: "2BR", price: "AED 2,100,000", status: "Available", updated_at: "2026-08-15 11:00", notes: "corner unit, sea view" },
  { id: "P-08", project: "Skyline Towers", unit: "2201", beds: "2BR", price: "USD 2,100,000", status: "Available", updated_at: "2026-08-16 09:00", notes: "currency typo somewhere - unclear which row" },
  { id: "P-09", project: "Horizon Heights", unit: "1108", beds: "2BR", price: "AED 1,400,000", status: "Withdrawn", updated_at: "2026-08-01 10:00", notes: "owner pulled listing from market 1 Aug" },
  { id: "P-10", project: "Horizon Heights", unit: "1109", beds: "2BR", price: "AED 1,420,000", status: "Available", updated_at: "2026-08-18 09:00", notes: "-" },
  { id: "P-11", project: "Seafront Elite", unit: "501", beds: "4BR", price: "AED 3,200,000", status: "Available", updated_at: "2026-08-11 09:00", notes: "agent commission 2%" },
  { id: "P-12", project: "Marina Heights", unit: "704", beds: "2BR", price: "AED 1,700,000", status: "Available", updated_at: "2026-08-14 10:00", notes: "different building to Marina Bay Residences" },
]

export function getListing(id: string) { return listings.find((listing) => listing.id === id) }
export function parseMoney(value: string) { const match = value.match(/([A-Z]+) ([\d,]+)/); return match ? { currency: match[1], amount: Number(match[2].replaceAll(',', '')) } : null }
export function parsePercent(value: string) { const match = value.match(/(\d+(?:\.\d+)?)%/); return match ? Number(match[1]) : null }
export function formatMoney(currency: string, amount: number) { return `${currency} ${amount.toLocaleString('en-US')}` }
