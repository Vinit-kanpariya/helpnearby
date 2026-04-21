export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  location?: {
    type: string;
    coordinates: number[];
    address?: string;
  };
  bio?: string;
  avatar?: string;
  rating: number;
  tasksHelped: number;
  requestsPosted: number;
  verified: boolean;
  createdAt: string;
}

export interface Offer {
  _id: string;
  user: User | string;
  message: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface HelpRequest {
  _id: string;
  title: string;
  description: string;
  requester: User;
  category: string;
  status: "active" | "in_progress" | "completed" | "cancelled";
  date: string;
  time: string;
  location: {
    address: string;
    coordinates: number[];
  };
  rewardType: "cash" | "food" | "favour" | "free";
  rewardAmount?: number;
  rewardDescription?: string;
  offers: Offer[];
  helper?: User;
  createdAt: string;
}

export interface Message {
  _id: string;
  sender: User | string;
  receiver: User | string;
  requestId?: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface Notification {
  _id: string;
  user: string;
  type: "offer" | "message" | "completed" | "rating" | "nearby" | "accepted";
  title: string;
  body: string;
  relatedRequest?: string;
  relatedUser?: string;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  user: User;
  lastMessage: Message;
  unreadCount: number;
}
