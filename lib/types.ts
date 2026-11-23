export type Role = "client" | "pro" | "admin";
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_demo: number;
  session_version: number;
  disabled: number;
}
export interface Professional {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  specialty: string;
  bio: string;
  experience: number;
  remote: number;
  min_notice: number;
  gap: number;
  cancel_hours: number;
  auto_confirm: number;
  is_demo: number;
  zones?: string[];
  services?: Service[];
  min_price?: number | null;
  rating?: number | null;
  review_count?: number;
}
export interface Service {
  id: string;
  professional_id: string;
  name: string;
  description: string;
  price_cents: number | null;
  price_type: string;
  duration: number;
  mode: string;
  requirements: string;
  active: number;
}
export interface Schedule {
  id: string;
  professional_id: string;
  weekday: number;
  start_minute: number;
  end_minute: number;
}
export interface Exception {
  id: string;
  professional_id: string;
  starts_at: number;
  ends_at: number;
  reason: string;
}
export interface Booking {
  id: string;
  professional_id: string;
  client_id: string | null;
  own_client_id: string | null;
  request_id: string | null;
  service_id: string | null;
  starts_at: number;
  ends_at: number;
  busy_until: number;
  status: string;
  source: string;
  commission_bps: number;
  title: string;
  notes: string;
  cancellation_reason: string | null;
  amount_cents: number | null;
  collection_status: string;
  created_at: number;
  client_name?: string;
  professional_name?: string;
}
export interface WorkRequest {
  id: string;
  client_id: string;
  professional_id: string;
  title: string;
  description: string;
  symptoms: string;
  mode: string;
  status: string;
  created_at: number;
  updated_at: number;
  client_name: string;
  professional_name: string;
  slug: string;
  last_sender_id?: string | null;
}
export interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: number;
  sender_name: string;
}
export interface Attachment {
  id: string;
  request_id: string;
  message_id: string | null;
  name: string;
  size: number;
  created_at: number;
}
export interface Quote {
  id: string;
  request_id: string;
  version: number;
  status: string;
  notes: string;
  total_cents: number;
  created_at: number;
  lines: QuoteLine[];
}
export interface QuoteLine {
  id?: string;
  description: string;
  quantity: number;
  unit_cents: number;
}
export interface History {
  id: string;
  actor_name: string;
  entity_type: string;
  entity_id: string;
  from_status: string | null;
  to_status: string;
  note: string;
  created_at: number;
}
export interface OwnClient {
  id: string;
  professional_id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  created_at: number;
}
export interface Notice {
  id: string;
  request_id: string | null;
  body: string;
  read_at: number | null;
  created_at: number;
}
export interface IncidentResponse {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: number;
}
export interface Incident {
  id: string;
  request_id: string;
  opened_by: string;
  title: string;
  status: string;
  created_at: number;
  responses: IncidentResponse[];
}
export interface Review {
  id: string;
  rating: number;
  body: string;
  author_name: string;
  created_at: number;
}
export interface PortfolioItem {
  id: string;
  professional_id: string;
  title: string;
  description: string;
  is_demo: number;
}
export interface RequestDetail {
  request: WorkRequest;
  messages: Message[];
  attachments: Attachment[];
  quotes: Quote[];
  bookings: Booking[];
  history: History[];
  incidents: Incident[];
  services: Service[];
  professional: Professional;
  reviews: Review[];
}
export interface Workspace {
  user: User;
  professional: Professional | null;
  requests: WorkRequest[];
  bookings: Booking[];
  notifications: Notice[];
  clients: OwnClient[];
  schedule: Schedule[];
  exceptions: Exception[];
  services: Service[];
  incidents: Incident[];
  portfolio: PortfolioItem[];
}
