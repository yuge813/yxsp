"""Original raster icon set. No font icons, remote assets, or runtime SVG dependency."""
from PIL import Image,ImageDraw
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'sage_dksy/resource/ui'
ROOT.mkdir(exist_ok=True)
S=6
PALETTE={'ink':'#20352E','brand':'#BF442A','muted':'#64735F','light':'#FFFEFA','green':'#516B4E'}

def icon(name,c):
 im=Image.new('RGBA',(144,144));d=ImageDraw.Draw(im);w=10
 def points(ps):return [(round(x*S),round(y*S)) for x,y in ps]
 def line(ps,wide=w):d.line(points(ps),fill=c,width=wide,joint='curve')
 def rect(box,r=2):d.rounded_rectangle([round(v*S) for v in box],radius=r*S,outline=c,width=w)
 def ellipse(box,fill=None):d.ellipse([round(v*S) for v in box],outline=c if fill is None else None,width=w,fill=fill)
 if name=='home':line([(3,10),(12,3),(21,10),(21,21),(15,21),(15,14),(9,14),(9,21),(3,21),(3,10)])
 elif name=='task':rect((5,4,19,22),2);rect((9,2,15,7),1);line([(9,12),(15,12)]);line([(9,17),(14,17)])
 elif name=='gift':rect((3,8,21,13),1);line([(5,13),(5,21),(19,21),(19,13)]);line([(12,8),(12,21)]);line([(12,8),(7,2),(4,3),(4,6),(12,8),(17,2),(20,3),(20,6),(12,8)])
 elif name in ['user','friend']:ellipse((8,3,16,11));line([(4,21),(4,18),(6,15),(9,13),(15,13),(18,15),(20,18),(20,21)])
 elif name in ['check','calendar']:rect((4,5,20,21),3);line([(8,2),(8,7)]);line([(16,2),(16,7)]);line([(4,11),(20,11)]);line([(8,16),(11,18),(16,13)])
 elif name=='book':line([(12,5),(7,3),(2,4),(2,20),(7,19),(12,21),(17,19),(22,20),(22,4),(17,3),(12,5),(12,21)])
 elif name=='play':rect((3,4,21,20),4);line([(10,8),(16,12),(10,16),(10,8)])
 elif name=='arrow':line([(9,5),(16,12),(9,19)])
 elif name=='back':line([(15,4),(7,12),(15,20)])
 elif name=='bell':line([(3,18),(5,15),(5,9),(6,5),(9,3),(15,3),(18,5),(19,9),(19,15),(21,18),(3,18)]);line([(10,22),(14,22)])
 elif name=='coin':ellipse((2,2,22,22));line([(15,7),(10,7),(8,9),(9,12),(14,12),(16,15),(14,17),(9,17)]);line([(12,5),(12,19)],7)
 elif name=='order':line([(6,2),(18,2),(18,22),(15,20),(12,22),(9,20),(6,22),(6,2)]);line([(9,7),(15,7)]);line([(9,12),(15,12)]);line([(9,17),(13,17)])
 elif name=='heart':line([(12,21),(3,12),(2,8),(3,5),(6,3),(9,3),(12,6),(15,3),(18,3),(21,5),(22,8),(21,12),(12,21)])
 elif name=='location':ellipse((9,6,15,12));line([(12,22),(5,13),(4,9),(5,5),(8,2),(16,2),(19,5),(20,9),(19,13),(12,22)])
 elif name=='settings':ellipse((8,8,16,16));line([(9,2),(15,2),(16,5),(19,6),(22,9),(20,12),(22,15),(19,18),(16,19),(15,22),(9,22),(8,19),(5,18),(2,15),(4,12),(2,9),(5,6),(8,5),(9,2)])
 elif name=='support':line([(4,14),(4,9),(6,5),(10,3),(14,3),(18,5),(20,9),(20,14)]);rect((2,12,7,19),1);rect((17,12,22,19),1);line([(18,19),(17,22),(12,22)])
 elif name=='grid':
  for b in [(3,3,10,10),(14,3,21,10),(3,14,10,21),(14,14,21,21)]:rect(b,1)
 elif name=='share':line([(12,15),(12,2),(7,7),(12,2),(17,7)]);line([(5,12),(3,12),(3,21),(21,21),(21,12),(19,12)])
 elif name=='search':ellipse((3,3,16,16));line([(15,15),(22,22)])
 elif name=='yes':line([(4,12),(10,18),(21,6)])
 elif name=='close':line([(5,5),(19,19)]);line([(5,19),(19,5)])
 elif name=='leaf':line([(3,21),(17,6)]);line([(5,17),(3,12),(5,7),(10,3),(21,2),(21,12),(18,18),(12,20),(5,17)])
 elif name=='refresh':line([(20,9),(18,5),(14,3),(9,3),(5,5),(3,9),(3,14),(5,18),(9,21),(15,21),(19,18)]);line([(16,9),(21,10),(21,4)])
 elif name=='info':ellipse((2,2,22,22));line([(12,11),(12,18)]);ellipse((11,6,13,8),c)
 elif name=='image':rect((3,3,21,21),3);ellipse((7,7,10,10));line([(4,18),(9,13),(13,17),(17,11),(21,15)])
 else:raise ValueError(name)
 return im.resize((96,96),Image.Resampling.LANCZOS)
for name in ['home','task','gift','user','check','book','play','arrow','bell','coin','order','friend','heart','location','settings','support','grid','share','search','back','yes','close','leaf','refresh','info','image']:
 for tone,color in PALETTE.items():icon(name,color).quantize(colors=32,method=Image.Quantize.FASTOCTREE).save(ROOT/f'{name}-{tone}.png',optimize=True)
print('Generated',len(list(ROOT.glob('*.png'))),'original icons')
