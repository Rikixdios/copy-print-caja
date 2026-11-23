import { cajaApiDenied } from '../../caja-access';
import {env} from 'cloudflare:workers';
export async function POST(request:Request){
 const denied=await cajaApiDenied(request);if(denied)return denied;

 const headers={'Cache-Control':'no-store'};
 const configured=(env as unknown as Record<string,unknown>).MANAGEMENT_PASSWORD;
 if(typeof configured!=='string'||!configured)return Response.json({error:'El acceso a Gerencia no está configurado.'},{status:503,headers});
 try{
  const body=await request.json() as {password?:unknown};
  if(typeof body.password!=='string'||body.password.length>64)return Response.json({error:'Contraseña incorrecta.'},{status:401,headers});
  const encoder=new TextEncoder(),[actual,expected]=await Promise.all([crypto.subtle.digest('SHA-256',encoder.encode(body.password)),crypto.subtle.digest('SHA-256',encoder.encode(configured))]);
  const a=new Uint8Array(actual),b=new Uint8Array(expected);let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];
  return difference===0?Response.json({ok:true},{headers}):Response.json({error:'Contraseña incorrecta.'},{status:401,headers});
 }catch{return Response.json({error:'No se pudo verificar la contraseña.'},{status:400,headers});}
}
