import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Firestore layout, shared with the Android app (see babynames-android/firestore.rules):
 *
 *   couples/{code}/members/{uid}          { userId, joinedAtMs }
 *   couples/{code}/swipes/{uid}_{id}      { userId, clusterId, liked, ts }
 *   couples/{code}/matches/{id}           { clusterId, matchedAt }
 *   couples/{code}/rankings/{uid}         { order: [id, ...] }
 *
 * Every doc ID is deterministic, so two clients writing the same thing at once
 * (both detecting a match, a retried swipe) just overwrite each other harmlessly.
 */
const couple = (code: string) => `couples/${code}`;
const membersPath = (code: string) => `${couple(code)}/members`;
const swipesPath = (code: string) => `${couple(code)}/swipes`;

export async function coupleExists(code: string): Promise<boolean> {
  return !(await getDocs(collection(db(), membersPath(code)))).empty;
}

export async function createCouple(code: string, uid: string): Promise<void> {
  await setDoc(doc(db(), `${membersPath(code)}/${uid}`), { userId: uid, joinedAtMs: Date.now() });
}

/** True if the couple exists and this user is now (or already was) one of its two members. */
export async function joinCouple(code: string, uid: string): Promise<boolean> {
  const members = await getDocs(collection(db(), membersPath(code)));
  if (members.empty) return false;
  if (members.docs.some((d) => d.id === uid)) return true;
  if (members.size >= 2) return false;
  await setDoc(doc(db(), `${membersPath(code)}/${uid}`), { userId: uid, joinedAtMs: Date.now() });
  return true;
}

/** Calls back with the other member's uid (or null until they join). */
export function watchPartnerId(code: string, myUid: string, cb: (partnerId: string | null) => void): Unsubscribe {
  return onSnapshot(
    collection(db(), membersPath(code)),
    (snap) => cb(snap.docs.map((d) => d.id).find((id) => id !== myUid) ?? null),
    (err) => console.warn("members listener error", err),
  );
}

export async function pushSwipe(code: string, uid: string, clusterId: number, liked: boolean, ts: number): Promise<boolean> {
  try {
    await setDoc(doc(db(), `${swipesPath(code)}/${uid}_${clusterId}`), { userId: uid, clusterId, liked, ts });
    return true;
  } catch (err) {
    console.warn("pushSwipe failed, will retry", err);
    return false;
  }
}

export async function deleteSwipe(code: string, uid: string, clusterId: number): Promise<void> {
  try {
    await deleteDoc(doc(db(), `${swipesPath(code)}/${uid}_${clusterId}`));
  } catch (err) {
    console.warn("deleteSwipe failed", err);
  }
}

export async function pushMatch(code: string, clusterId: number, matchedAt: number): Promise<void> {
  try {
    await setDoc(doc(db(), `${couple(code)}/matches/${clusterId}`), { clusterId, matchedAt });
  } catch (err) {
    console.warn("pushMatch failed", err);
  }
}

export async function deleteMatch(code: string, clusterId: number): Promise<void> {
  try {
    await deleteDoc(doc(db(), `${couple(code)}/matches/${clusterId}`));
  } catch (err) {
    console.warn("deleteMatch failed", err);
  }
}

export async function pushRanking(code: string, uid: string, order: number[]): Promise<boolean> {
  try {
    await setDoc(doc(db(), `${couple(code)}/rankings/${uid}`), { order });
    return true;
  } catch (err) {
    console.warn("pushRanking failed", err);
    return false;
  }
}

/** Live list of the partner's liked cluster IDs. */
export function watchPartnerLikes(code: string, partnerId: string, cb: (ids: number[]) => void): Unsubscribe {
  const q = query(collection(db(), swipesPath(code)), where("userId", "==", partnerId), where("liked", "==", true));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data().clusterId).filter((id): id is number => typeof id === "number")),
    (err) => console.warn("partner swipes listener error", err),
  );
}

export function watchPartnerRanking(code: string, partnerId: string, cb: (order: number[]) => void): Unsubscribe {
  return onSnapshot(
    doc(db(), `${couple(code)}/rankings/${partnerId}`),
    (snap) => {
      const order = snap.data()?.order;
      cb(Array.isArray(order) ? order.filter((n): n is number => typeof n === "number") : []);
    },
    (err) => console.warn("partner ranking listener error", err),
  );
}
