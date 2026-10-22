'use server';
// Server actions called from the UI. Every one checks the login cookie first and
// returns { ok, error } instead of throwing (thrown errors are hidden in production builds).
import { requireAuth } from './auth';
import * as M from './mutations';
import type { ExamInput, FileInfo, SessionInput } from './mutations';
import type { HabitKind, Kind, Settings } from './types';

export interface R {
  ok: boolean;
  error?: string;
  id?: number;
  n?: number;
}

async function guard(fn: () => Promise<number | void>, as: 'id' | 'n' = 'id'): Promise<R> {
  try {
    await requireAuth();
    const r = await fn();
    return typeof r === 'number' ? { ok: true, [as]: r } : { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message || 'Something went wrong' };
  }
}

export async function addSubject(name: string, color: string) {
  return guard(() => M.addSubject(name, color));
}
export async function updateSubject(id: number, name: string, color: string) {
  return guard(() => M.updateSubject(id, name, color));
}
export async function deleteSubject(id: number) {
  return guard(() => M.deleteSubject(id));
}
export async function addChapter(subjectId: number, title: string) {
  return guard(() => M.addChapter(subjectId, title));
}
export async function renameChapter(id: number, title: string) {
  return guard(() => M.renameChapter(id, title));
}
export async function deleteChapter(id: number) {
  return guard(() => M.deleteChapter(id));
}
export async function addUnits(chapterId: number, kind: Kind, count: number, label?: string) {
  return guard(() => M.addUnits(chapterId, kind, count, label));
}
export async function addFile(chapterId: number, file: FileInfo) {
  return guard(() => M.addFile(chapterId, file));
}
export async function attachFile(materialId: number, file: FileInfo) {
  return guard(() => M.attachFile(materialId, file));
}
export async function removeFile(materialId: number) {
  return guard(() => M.removeFile(materialId));
}
export async function updateMaterial(
  id: number,
  v: { title: string; kind: Kind; chapterId: number; estMinutes: number | null },
) {
  return guard(() => M.updateMaterial(id, v));
}
export async function toggleMaterial(id: number, done: boolean) {
  return guard(() => M.toggleMaterial(id, done));
}
export async function deleteMaterial(id: number) {
  return guard(() => M.deleteMaterial(id));
}
export async function saveExam(e: ExamInput) {
  return guard(() => M.saveExam(e));
}
export async function deleteExam(id: number) {
  return guard(() => M.deleteExam(id));
}
export async function logSession(s: SessionInput) {
  return guard(() => M.logSession(s));
}
export async function deleteSession(id: number) {
  return guard(() => M.deleteSession(id));
}
export async function setHabit(date: string, kind: HabitKind, on: boolean, count = 1) {
  return guard(() => M.setHabit(date, kind, on, count));
}
export async function saveSettings(s: Partial<Settings>) {
  return guard(() => M.saveSettings(s));
}
export async function seedStarter() {
  return guard(() => M.seedStarter(), 'n');
}
