// A curated universe of 100 liquid NSE large-caps, grouped by sector, so
// nobody has to remember Yahoo ticker syntax. The backend still accepts any
// Yahoo symbol — this list powers the dropdowns, it doesn't limit the API.

export const UNIVERSE = [
  // IT
  { t: "TCS.NS", name: "Tata Consultancy Services", sector: "IT" },
  { t: "INFY.NS", name: "Infosys", sector: "IT" },
  { t: "HCLTECH.NS", name: "HCL Technologies", sector: "IT" },
  { t: "WIPRO.NS", name: "Wipro", sector: "IT" },
  { t: "TECHM.NS", name: "Tech Mahindra", sector: "IT" },
  { t: "LTIM.NS", name: "LTIMindtree", sector: "IT" },
  { t: "PERSISTENT.NS", name: "Persistent Systems", sector: "IT" },
  { t: "COFORGE.NS", name: "Coforge", sector: "IT" },
  { t: "MPHASIS.NS", name: "Mphasis", sector: "IT" },
  { t: "OFSS.NS", name: "Oracle Financial Services", sector: "IT" },
  // Banks
  { t: "HDFCBANK.NS", name: "HDFC Bank", sector: "Banks" },
  { t: "ICICIBANK.NS", name: "ICICI Bank", sector: "Banks" },
  { t: "SBIN.NS", name: "State Bank of India", sector: "Banks" },
  { t: "KOTAKBANK.NS", name: "Kotak Mahindra Bank", sector: "Banks" },
  { t: "AXISBANK.NS", name: "Axis Bank", sector: "Banks" },
  { t: "INDUSINDBK.NS", name: "IndusInd Bank", sector: "Banks" },
  { t: "BANKBARODA.NS", name: "Bank of Baroda", sector: "Banks" },
  { t: "PNB.NS", name: "Punjab National Bank", sector: "Banks" },
  { t: "CANBK.NS", name: "Canara Bank", sector: "Banks" },
  { t: "FEDERALBNK.NS", name: "Federal Bank", sector: "Banks" },
  // FMCG
  { t: "HINDUNILVR.NS", name: "Hindustan Unilever", sector: "FMCG" },
  { t: "ITC.NS", name: "ITC", sector: "FMCG" },
  { t: "NESTLEIND.NS", name: "Nestlé India", sector: "FMCG" },
  { t: "BRITANNIA.NS", name: "Britannia Industries", sector: "FMCG" },
  { t: "DABUR.NS", name: "Dabur India", sector: "FMCG" },
  { t: "GODREJCP.NS", name: "Godrej Consumer Products", sector: "FMCG" },
  { t: "MARICO.NS", name: "Marico", sector: "FMCG" },
  { t: "COLPAL.NS", name: "Colgate-Palmolive India", sector: "FMCG" },
  { t: "TATACONSUM.NS", name: "Tata Consumer Products", sector: "FMCG" },
  { t: "VBL.NS", name: "Varun Beverages", sector: "FMCG" },
  // Auto
  { t: "MARUTI.NS", name: "Maruti Suzuki", sector: "Auto" },
  { t: "M&M.NS", name: "Mahindra & Mahindra", sector: "Auto" },
  { t: "TATAMOTORS.NS", name: "Tata Motors", sector: "Auto" },
  { t: "BAJAJ-AUTO.NS", name: "Bajaj Auto", sector: "Auto" },
  { t: "EICHERMOT.NS", name: "Eicher Motors", sector: "Auto" },
  { t: "HEROMOTOCO.NS", name: "Hero MotoCorp", sector: "Auto" },
  { t: "TVSMOTOR.NS", name: "TVS Motor", sector: "Auto" },
  { t: "ASHOKLEY.NS", name: "Ashok Leyland", sector: "Auto" },
  { t: "BHARATFORG.NS", name: "Bharat Forge", sector: "Auto" },
  { t: "MOTHERSON.NS", name: "Samvardhana Motherson", sector: "Auto" },
  // Pharma & Healthcare
  { t: "SUNPHARMA.NS", name: "Sun Pharmaceutical", sector: "Pharma & Healthcare" },
  { t: "DRREDDY.NS", name: "Dr. Reddy's Laboratories", sector: "Pharma & Healthcare" },
  { t: "CIPLA.NS", name: "Cipla", sector: "Pharma & Healthcare" },
  { t: "DIVISLAB.NS", name: "Divi's Laboratories", sector: "Pharma & Healthcare" },
  { t: "LUPIN.NS", name: "Lupin", sector: "Pharma & Healthcare" },
  { t: "AUROPHARMA.NS", name: "Aurobindo Pharma", sector: "Pharma & Healthcare" },
  { t: "TORNTPHARM.NS", name: "Torrent Pharmaceuticals", sector: "Pharma & Healthcare" },
  { t: "ALKEM.NS", name: "Alkem Laboratories", sector: "Pharma & Healthcare" },
  { t: "BIOCON.NS", name: "Biocon", sector: "Pharma & Healthcare" },
  { t: "APOLLOHOSP.NS", name: "Apollo Hospitals", sector: "Pharma & Healthcare" },
  // Energy & Utilities
  { t: "RELIANCE.NS", name: "Reliance Industries", sector: "Energy & Utilities" },
  { t: "ONGC.NS", name: "Oil & Natural Gas Corp", sector: "Energy & Utilities" },
  { t: "IOC.NS", name: "Indian Oil", sector: "Energy & Utilities" },
  { t: "BPCL.NS", name: "Bharat Petroleum", sector: "Energy & Utilities" },
  { t: "GAIL.NS", name: "GAIL India", sector: "Energy & Utilities" },
  { t: "COALINDIA.NS", name: "Coal India", sector: "Energy & Utilities" },
  { t: "NTPC.NS", name: "NTPC", sector: "Energy & Utilities" },
  { t: "POWERGRID.NS", name: "Power Grid Corp", sector: "Energy & Utilities" },
  { t: "TATAPOWER.NS", name: "Tata Power", sector: "Energy & Utilities" },
  { t: "ADANIGREEN.NS", name: "Adani Green Energy", sector: "Energy & Utilities" },
  // Metals & Mining
  { t: "TATASTEEL.NS", name: "Tata Steel", sector: "Metals & Mining" },
  { t: "JSWSTEEL.NS", name: "JSW Steel", sector: "Metals & Mining" },
  { t: "HINDALCO.NS", name: "Hindalco Industries", sector: "Metals & Mining" },
  { t: "VEDL.NS", name: "Vedanta", sector: "Metals & Mining" },
  { t: "JINDALSTEL.NS", name: "Jindal Steel & Power", sector: "Metals & Mining" },
  { t: "SAIL.NS", name: "Steel Authority of India", sector: "Metals & Mining" },
  { t: "NMDC.NS", name: "NMDC", sector: "Metals & Mining" },
  { t: "NATIONALUM.NS", name: "National Aluminium", sector: "Metals & Mining" },
  { t: "APLAPOLLO.NS", name: "APL Apollo Tubes", sector: "Metals & Mining" },
  { t: "HINDZINC.NS", name: "Hindustan Zinc", sector: "Metals & Mining" },
  // Infra & Cement
  { t: "LT.NS", name: "Larsen & Toubro", sector: "Infra & Cement" },
  { t: "SIEMENS.NS", name: "Siemens India", sector: "Infra & Cement" },
  { t: "ABB.NS", name: "ABB India", sector: "Infra & Cement" },
  { t: "HAVELLS.NS", name: "Havells India", sector: "Infra & Cement" },
  { t: "POLYCAB.NS", name: "Polycab India", sector: "Infra & Cement" },
  { t: "ADANIPORTS.NS", name: "Adani Ports & SEZ", sector: "Infra & Cement" },
  { t: "ULTRACEMCO.NS", name: "UltraTech Cement", sector: "Infra & Cement" },
  { t: "GRASIM.NS", name: "Grasim Industries", sector: "Infra & Cement" },
  { t: "AMBUJACEM.NS", name: "Ambuja Cements", sector: "Infra & Cement" },
  { t: "DLF.NS", name: "DLF", sector: "Infra & Cement" },
  // Financial Services
  { t: "BAJFINANCE.NS", name: "Bajaj Finance", sector: "Financial Services" },
  { t: "BAJAJFINSV.NS", name: "Bajaj Finserv", sector: "Financial Services" },
  { t: "CHOLAFIN.NS", name: "Cholamandalam Investment", sector: "Financial Services" },
  { t: "SHRIRAMFIN.NS", name: "Shriram Finance", sector: "Financial Services" },
  { t: "MUTHOOTFIN.NS", name: "Muthoot Finance", sector: "Financial Services" },
  { t: "SBILIFE.NS", name: "SBI Life Insurance", sector: "Financial Services" },
  { t: "HDFCLIFE.NS", name: "HDFC Life Insurance", sector: "Financial Services" },
  { t: "ICICIPRULI.NS", name: "ICICI Prudential Life", sector: "Financial Services" },
  { t: "ICICIGI.NS", name: "ICICI Lombard", sector: "Financial Services" },
  { t: "PFC.NS", name: "Power Finance Corp", sector: "Financial Services" },
  // Consumer & Telecom
  { t: "BHARTIARTL.NS", name: "Bharti Airtel", sector: "Consumer & Telecom" },
  { t: "TITAN.NS", name: "Titan Company", sector: "Consumer & Telecom" },
  { t: "ASIANPAINT.NS", name: "Asian Paints", sector: "Consumer & Telecom" },
  { t: "DMART.NS", name: "Avenue Supermarts (DMart)", sector: "Consumer & Telecom" },
  { t: "TRENT.NS", name: "Trent", sector: "Consumer & Telecom" },
  { t: "PIDILITIND.NS", name: "Pidilite Industries", sector: "Consumer & Telecom" },
  { t: "BERGEPAINT.NS", name: "Berger Paints", sector: "Consumer & Telecom" },
  { t: "NAUKRI.NS", name: "Info Edge (Naukri)", sector: "Consumer & Telecom" },
  { t: "IRCTC.NS", name: "IRCTC", sector: "Consumer & Telecom" },
  { t: "INDIGO.NS", name: "InterGlobe Aviation (IndiGo)", sector: "Consumer & Telecom" },
];

export const INDICES = [
  { t: "^NSEI", name: "NIFTY 50" },
  { t: "^BSESN", name: "SENSEX" },
  { t: "^GSPC", name: "S&P 500" },
];

export const SECTOR_LIST = [...new Set(UNIVERSE.map((s) => s.sector))];

export const NAME_OF = Object.fromEntries(
  [...UNIVERSE, ...INDICES].map((s) => [s.t, s.name])
);

export const bySector = (sec) => UNIVERSE.filter((s) => s.sector === sec);
