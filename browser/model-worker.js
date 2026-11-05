import {WebWorkerMLCEngineHandler} from '@mlc-ai/web-llm';
const handler=new WebWorkerMLCEngineHandler();
onmessage=event=>handler.onmessage(event);
