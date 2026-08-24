let entries: any[] = []
export function addLog(entry:any){ entries.push(entry); return entry }
export function getLog(){ return entries }
