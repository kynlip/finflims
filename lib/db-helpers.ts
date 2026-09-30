import clientPromise from './mongodb';
import { Db } from 'mongodb';

export async function getUsersDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db('captainmedia');
}

export async function getAnimeDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db('captainmedia');
}
