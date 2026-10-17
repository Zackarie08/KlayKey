import mysql from 'mysql2/promise';
import {config} from '../config.js';
export const pool=mysql.createPool(config.db);
export async function transaction(fn){const db=await pool.getConnection();try{await db.beginTransaction();const result=await fn(db);await db.commit();return result;}catch(e){await db.rollback();throw e;}finally{db.release();}}
export async function rows(sql,params=[],db=pool){return (await db.execute(sql,params))[0];}
export const json=value=>typeof value==='string'?JSON.parse(value):value;
