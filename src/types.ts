export interface Course {
  id: number;
  name: string;
  imageUrl?: string;
  price?: number;
  finalPrice?: number;
  description?: string;
  category?: string;
  validity?: string;
}

export interface Subject {
  id: number;
  name: string;
  videoCount?: number;
  tileId?: string;
}

export interface Topic {
  id: number;
  name: string;
  videoCount?: number;
  tileId?: string;
  isLeaf?: boolean;
}

export interface Lecture {
  id: number;
  name: string;
  contentType: number; // 0: folder, 1: doc/youtube, 2: video, 3: pdf
  duration?: number;
  thumbnailUrl?: string;
  videoUrl?: string;
  vdcId?: string;
  bitrateUrls?: { title: string; url: string }[];
  isLocked?: boolean;
  originalLocked?: boolean;
  isYouTube?: boolean;
  videoCount?: number;
}

export interface Platform {
  id: string;
  name: string;
  description: string;
  available: boolean;
  icon?: string;
  color?: string;
}

export type ViewType = "courses" | "subjects" | "topics" | "lectures";

export interface NavState {
  view: ViewType;
  platform: string;
  courseId?: number;
  courseName?: string;
  subjectId?: number;
  subjectName?: string;
  topicId?: number;
  topicName?: string;
  search?: string;
  tab?: "all" | "enrolled";
}
