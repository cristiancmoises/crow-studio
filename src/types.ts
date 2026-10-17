export type ElementType='text'|'rect'|'ellipse'|'triangle'|'line'|'image';
export type SceneElement={id:string;type:ElementType;x:number;y:number;w:number;h:number;rotation:number;fill:string;opacity:number;stroke:string;strokeWidth:number;radius:number;locked:boolean;hidden:boolean;text:string;fontSize:number;fontFamily:string;fontStyle:'normal'|'bold'|'italic'|'bold italic';align:'left'|'center'|'right';src?:string};
export type Page={id:string;name:string;width:number;height:number;background:string;elements:SceneElement[]};
export type Document={version:1;name:string;pages:Page[]};
export type Project={id:string;name:string;document:Document;preview:Page;revision:number;favorite:boolean;updatedAt:string};
export type ProjectSummary=Omit<Project,'document'>;
export type Brand={name:string;colors:string[];fontFamily:string};
export type Template={id:string;name:string;category:string;tags:string[];page:Page};
export type Notice=(message:string)=>void;
