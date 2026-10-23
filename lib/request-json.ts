export class RequestBodyError extends Error {
  status:number;
  constructor(message:string,status:number){super(message);this.status=status}
}
export async function readLimitedJson(request:Request,limit:number):Promise<unknown>{
  if(Number(request.headers.get('content-length'))>limit)throw new RequestBodyError('Request is too large.',413);
  const reader=request.body?.getReader();if(!reader)throw new RequestBodyError('Invalid request.',400);
  let text='',bytes=0;const decoder=new TextDecoder();
  try{
    while(true){
      const {done,value}=await reader.read();if(done)break;
      bytes+=value.byteLength;
      if(bytes>limit){await reader.cancel();throw new RequestBodyError('Request is too large.',413)}
      text+=decoder.decode(value,{stream:true});
    }
    text+=decoder.decode();return JSON.parse(text);
  }catch(error){
    if(error instanceof RequestBodyError)throw error;
    throw new RequestBodyError('Invalid JSON request.',400);
  }finally{reader.releaseLock()}
}
