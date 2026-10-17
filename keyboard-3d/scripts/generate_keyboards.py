"""Run with Blender: blender -b --python scripts/generate_keyboards.py -- --layout all"""
import argparse
import json
import sys
from pathlib import Path

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
import bpy
from keyboard_generator import layouts, materials, components, export


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--layout',choices=['all','60','75','100'],default='all')
    parser.add_argument('--no-render',action='store_true')
    parser.add_argument('--output',type=Path,help='Optional output root; configuration still comes from this project')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    if bpy.app.version<(4,0,0): raise RuntimeError('Blender 4.x or newer is required')
    folder=args.output.resolve() if args.output else HERE.parent
    folder.mkdir(parents=True,exist_ok=True)
    for name in ['blender','exports','previews']: (folder/name).mkdir(exist_ok=True)
    options=json.loads((HERE.parent/'config'/'keyboard_options.json').read_text())
    compatibility=json.loads((HERE.parent/'config'/'compatibility.json').read_text())
    specs=[layouts.layout(s) for s in ['60','75','100']]
    for spec in specs:
        layouts.validate_layout(spec)
        if args.layout not in ('all',spec['id']): continue
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.context.scene.unit_settings.system='METRIC'
        bpy.context.scene.unit_settings.length_unit='MILLIMETERS'
        bpy.context.scene.render.film_transparent=False
        bpy.context.preferences.filepaths.save_version=0
        mats=materials.build(options)
        root=components.build(spec,mats)
        report=export.save(spec,root,folder,not args.no_render)
        print('KEYBOARD_REPORT',spec['id'],json.dumps(report),flush=True)
        (folder/'exports'/f"layout_{spec['id']}.json").write_text(json.dumps(spec,indent=2)+'\n')
    export.write_manifest(folder,specs,options,compatibility)
    print('GENERATION_COMPLETE',flush=True)


if __name__=='__main__': main()
