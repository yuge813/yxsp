from html.parser import HTMLParser
from pathlib import Path
import json,sys,re
class Parser(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.bindings={};self.root={'tag':'root','attrs':{},'children':[]};self.stack=[self.root]
 def feed(self,text):
  def protect(m):
   key='__WXML_BIND_'+str(len(self.bindings))+'__';self.bindings[key]=m.group(0);return key
  super().feed(re.sub(r'\{\{[\s\S]*?\}\}',protect,text))
 def restore(self,value):
  return re.sub(r'__WXML_BIND_\d+__',lambda m:self.bindings.get(m.group(0),m.group(0)),value)
 def handle_starttag(self,tag,attrs):
  node={'tag':tag,'attrs':dict((k,self.restore(v) if v is not None else '') for k,v in attrs),'children':[]};self.stack[-1]['children'].append(node)
  if tag not in ['input','image','import','include','br','hr']:self.stack.append(node)
 def handle_startendtag(self,tag,attrs):
  self.stack[-1]['children'].append({'tag':tag,'attrs':dict((k,self.restore(v) if v is not None else '') for k,v in attrs),'children':[]})
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i]['tag']==tag:self.stack=self.stack[:i];break
 def handle_data(self,text):self.stack[-1]['children'].append(self.restore(text))
r=Path(__file__).resolve().parents[2];asts={}
for p in r.rglob('*.wxml'):
 if '.git' in p.parts:continue
 parser=Parser();parser.feed(p.read_text());asts[str(p.relative_to(r))]=parser.root
json.dump(asts,sys.stdout,ensure_ascii=False)
