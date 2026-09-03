"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { EducationItem, ExperienceItem, ResumeData } from "./types";

export const emptyResume: ResumeData = {
  fullName: "",
  jobTitle: "",
  email: "",
  phone: "",
  city: "",
  linkedin: "",
  summary: "",
  jobDescription: "",
  experiences: [],
  education: [],
  skills: [],
  certifications: [],
  languages: [],
  templateId: "modern",
};

interface ResumeContextValue {
  data: ResumeData;
  replace: (value: ResumeData) => void;
  update: <K extends keyof ResumeData>(key: K, value: ResumeData[K]) => void;
  addExperience: () => void;
  updateExperience: (id: string, field: keyof ExperienceItem, value: string) => void;
  removeExperience: (id: string) => void;
  addEducation: () => void;
  updateEducation: (id: string, field: keyof EducationItem, value: string) => void;
  removeEducation: (id: string) => void;
  addSkill: (skill: string) => void;
  removeSkill: (skill: string) => void;
  reset: () => void;
}

const ResumeContext = createContext<ResumeContextValue | null>(null);

let idCounter = 0;
const nextId = () => `item-${++idCounter}`;

export function ResumeProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ResumeData>(emptyResume);

  const replace = useCallback((value: ResumeData) => setData(value), []);

  const update = useCallback(
    <K extends keyof ResumeData>(key: K, value: ResumeData[K]) => {
      setData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const addExperience = useCallback(() => {
    setData((prev) => ({
      ...prev,
      experiences: [
        ...prev.experiences,
        { id: nextId(), role: "", company: "", period: "", description: "" },
      ],
    }));
  }, []);

  const updateExperience = useCallback(
    (id: string, field: keyof ExperienceItem, value: string) => {
      setData((prev) => ({
        ...prev,
        experiences: prev.experiences.map((exp) =>
          exp.id === id ? { ...exp, [field]: value } : exp
        ),
      }));
    },
    []
  );

  const removeExperience = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((exp) => exp.id !== id),
    }));
  }, []);

  const addEducation = useCallback(() => {
    setData((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        { id: nextId(), degree: "", institution: "", year: "" },
      ],
    }));
  }, []);

  const updateEducation = useCallback(
    (id: string, field: keyof EducationItem, value: string) => {
      setData((prev) => ({
        ...prev,
        education: prev.education.map((edu) =>
          edu.id === id ? { ...edu, [field]: value } : edu
        ),
      }));
    },
    []
  );

  const removeEducation = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      education: prev.education.filter((edu) => edu.id !== id),
    }));
  }, []);

  const addSkill = useCallback((skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    setData((prev) => {
      if (prev.skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      return { ...prev, skills: [...prev.skills, trimmed] };
    });
  }, []);

  const removeSkill = useCallback((skill: string) => {
    setData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  }, []);

  const reset = useCallback(() => setData(emptyResume), []);

  const value = useMemo(
    () => ({
      data,
      replace,
      update,
      addExperience,
      updateExperience,
      removeExperience,
      addEducation,
      updateEducation,
      removeEducation,
      addSkill,
      removeSkill,
      reset,
    }),
    [
      data,
      replace,
      update,
      addExperience,
      updateExperience,
      removeExperience,
      addEducation,
      updateEducation,
      removeEducation,
      addSkill,
      removeSkill,
      reset,
    ]
  );

  return <ResumeContext.Provider value={value}>{children}</ResumeContext.Provider>;
}

export function useResume() {
  const ctx = useContext(ResumeContext);
  if (!ctx) {
    throw new Error("useResume deve ser usado dentro de <ResumeProvider>");
  }
  return ctx;
}