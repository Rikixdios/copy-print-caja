import { mergeStores } from './store-merge';
export type SyncStatus='loading'|'saving'|'saved'|'offline'|'error';
export type StoreJournal<T>={current:T;base:T;pending:boolean};
type Options<T>={initial:T;journal?:StoreJournal<T>;read:()=>Promise<T|null>;write:(store:T,base:T)=>Promise<T>;persist:(journal:StoreJournal<T>)=>void;onStore:(store:T)=>void;onStatus:(status:SyncStatus,error?:Error)=>void;online:()=>boolean};
export class StoreSynchronizer<T>{
 current:T;base:T;pending=false;ready=false;private generation=0;private flight:Promise<boolean>|null=null;private disposed=false;
 constructor(private options:Options<T>){this.current=options.journal?.current||options.initial;this.base=options.journal?.base||this.current;this.pending=options.journal?.pending||false;}
 private status(status:SyncStatus,error?:Error){if(!this.disposed)this.options.onStatus(status,error);}
 private publish(){this.options.persist({current:this.current,base:this.base,pending:this.pending});if(!this.disposed)this.options.onStore(this.current);}
 async load(){let failed=false;try{const remote=await this.options.read();if(this.disposed)return;if(remote){this.current=this.pending?mergeStores(this.base,this.current,remote):remote;this.base=remote;}else this.pending=true;}catch(error){if(this.disposed)return;failed=true;this.status('error',error instanceof Error?error:new Error('No se pudo cargar'));}
 if(this.disposed)return;this.ready=true;this.publish();if(this.pending)void this.flush();else if(!failed)this.status(this.options.online()?'saved':'offline');}
 update(updater:T|((store:T)=>T)){if(!this.ready)throw new Error('Esperá a que termine de cargar');this.current=typeof updater==='function'?(updater as (store:T)=>T)(this.current):updater;this.generation++;this.pending=true;this.publish();this.status(this.options.online()?'saving':'offline');void this.flush();}
 async flush():Promise<boolean>{if(this.flight)return this.flight;if(!this.ready||!this.pending)return !this.pending;if(!this.options.online()){this.status('offline');return false;}this.flight=this.send();try{return await this.flight;}finally{this.flight=null;}}
 private async send(){this.status('saving');try{while(this.pending&&!this.disposed){const sent=this.current,base=this.base;const remote=await this.options.write(sent,base);if(this.disposed)return false;const newer=this.current!==sent;this.current=newer?mergeStores(sent,this.current,remote):remote;this.base=remote;this.pending=newer;this.publish();}this.status('saved');return true;}catch(error){this.status(this.options.online()?'error':'offline',error instanceof Error?error:new Error('No se pudo guardar'));return false;}}
 async pull(){if(!this.ready||this.pending||this.flight||this.disposed||!this.options.online())return;const generation=this.generation;try{const remote=await this.options.read();if(!remote||this.disposed||generation!==this.generation||this.pending||this.flight)return;if(JSON.stringify(remote)!==JSON.stringify(this.current)){this.current=remote;this.base=remote;this.publish();}this.status('saved');}catch{}}
 snapshot(){return {store:this.current,base:this.base};}
 dispose(){this.disposed=true;}
}
