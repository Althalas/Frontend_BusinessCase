import { User } from "./user.model";

export interface Review {
  id: number;
  userId: number;
  stationId: number;
  rating: number;
  comment?: string;
  createdAt: Date;
  user?: User;
  station?: {
    id: number;
    name: string;
  };
}

export interface CreateReviewDto {
  stationId: number;
  rating?: number;
  comment?: string;
}
