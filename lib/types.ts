export type Role = "admin" | "staff" | "user";
export type ProfileStatus = "pending" | "approved" | "rejected";
export type EntryStatus = "pending" | "provisional" | "approved" | "rejected";
export type Account = {
  id: string;
  username: string | null;
  phone: string | null;
  role: Role;
  disabled: boolean;
  createdAt: string;
};
export type Athlete = {
  id: string;
  name: string;
  phone: string;
  email: string;
  gender: "Nam" | "Nữ";
  birthYear: string;
  address: string;
  rating: string;
  photo: string;
  status: ProfileStatus;
  note: string;
  createdAt: string;
  updatedAt: string;
};
export type Tournament = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  opensAt: string;
  deadline: string;
  location: string;
  categories: string[];
  categorySlots: Record<string, number>;
  capacity: number;
  fee: string;
  feeAmount: string;
  feeUnit: "athlete" | "pair";
  pairingMode: "self" | "draw" | "singles";
  description: string;
  image: string;
  posters: string[];
  status: "open" | "soon" | "closed";
  demo: boolean;
  featured: boolean;
  publishedAt: string | null;
  officialAt: string | null;
  publicationVersion: number;
  rejectionsPublished: boolean;
  counts: Record<
    string,
    { pending: number; provisional: number; approved: number; rejected: number }
  >;
  approved: number;
  provisional: number;
};
export type Article = {
  sections?: import("./articles").ArticleSection[];
  publishedAt?: string;
  id: string;
  title: string;
  category: string;
  date: string;
  excerpt: string;
  body: string;
  image: string;
  demo: boolean;
};
export type Media = {
  id: string;
  title: string;
  type: "image" | "video";
  url: string;
  thumbnail: string;
  month: string;
  expiresAt: string;
  demo: boolean;
};
export type Settings = {
  id: string;
  clubName: string;
  logoImage: string;
  contacts: { name: string; phone: string }[];
  contact: string;
  phone: string;
  address: string;
  zaloUrl: string;
  facebookUrl: string;
  facebookName: string;
  sponsors: { name: string; url: string }[];
  clubBannerImage: string;
  demo: boolean;
};
export type Registration = {
  id: string;
  tournamentId: string;
  athleteId: string;
  name: string;
  phone: string;
  email: string;
  gender: "Nam" | "Nữ";
  rating: string;
  category: string;
  partner: string;
  note: string;
  status: EntryStatus;
  adminNote: string;
  createdAt: string;
  reviewedAt: string | null;
  publishedStatus: EntryStatus;
  publishedNote: string;
  profileStatus: ProfileStatus;
};
export type PublicEntry = {
  id: string;
  isMe: boolean;
  name: string;
  gender: string;
  rating: string;
  category: string;
  partner: string;
  status: EntryStatus;
};
export type Submission = {
  id: string;
  kind: "tournament" | "article" | "album";
  targetId: string;
  operation: "create" | "edit";
  data: Record<string, any>;
  status: ProfileStatus;
  createdBy: string;
  author: string;
  createdAt: string;
  reviewedAt: string | null;
  note: string;
};
export type Message = {
  id: string;
  name: string;
  phone: string;
  body: string;
  read: boolean;
  createdAt: string;
};
export type RankedAthlete = Pick<
  Athlete,
  "id" | "name" | "gender" | "rating" | "address"
>;
export type SiteData = {
  tournaments: Tournament[];
  articles: Article[];
  albums: Album[];
  topics: string[];
  settings: Settings;
  categories: string[];
  ranking: RankedAthlete[];
};
export type AuthData = {
  account: Account | null;
  athlete: Athlete | null;
  registrations: Registration[];
};
export type AdminData = SiteData & {
  account: Account;
  athletes: Athlete[];
  registrations: Registration[];
  submissions: Submission[];
  messages: Message[];
  accounts: Account[];
};

export type Album = {
  id: string;
  publishedAt: string;
  title: string;
  date: string;
  description: string;
  cover: string;
  photoLinks: string[];
  videoLinks: string[];
  photos: { url: string; description: string }[];
  demo: boolean;
};
