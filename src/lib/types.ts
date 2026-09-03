export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  period: string;
  description: string;
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  year: string;
}

export interface ResumeData {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  city: string;
  linkedin: string;
  summary: string;
  jobDescription: string;
  experiences: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  certifications: string[];
  languages: string[];
  templateId: string;
}