"""ANSI layouts. x/y describe the upper-left key boundary in units.

Rows run rear to front; physical Blender Y is inverted in key_center().
No Blender dependency: layout checks can also run in ordinary Python.
"""
U = 19.05


def layout(size):
    keys = []

    def row(labels, y, widths=None, x=0, group=None):
        widths = widths or [1] * len(labels)
        for label, width in zip(labels, widths):
            ident = label.lower().replace(' ', '_')
            count = sum(k['id'].split('__')[0] == ident for k in keys)
            keys.append(dict(id=ident + (f'__{count}' if count else ''), legend=label,
                             row=int(y), x=x, y=y, width=width, height=1,
                             profileRow=min(4, max(0, round(y - offset))),
                             group=group or ('accent' if label in ('Esc', 'Enter') else
                                 'alpha' if len(label) == 1 else 'modifier')))
            x += width

    offset = 0 if size == '60' else 1.35
    row(['Esc'] + list('1234567890') + ['-', '=', 'Backspace'], offset,
        [1]*13 + [2])
    row(['Tab'] + list('QWERTYUIOP') + ['[', ']', '\\'], offset+1,
        [1.5]+[1]*12+[1.5])
    row(['Caps'] + list('ASDFGHJKL') + [';', "'", 'Enter'], offset+2,
        [1.75]+[1]*11+[2.25])
    row(['Shift'] + list('ZXCVBNM') + [',', '.', '/', 'Shift'], offset+3,
        [2.25]+[1]*10+[2.75 if size != '75' else 1.75])
    if size == '75':
        row(['Ctrl','Win','Alt','Space','Alt','Fn','Ctrl'], offset+4,
            [1.25]*3+[6.25]+[1]*3)
        row(['Left','Down','Right'], offset+4, x=13.25, group='accent')
        row(['Up'], offset+3, x=14.25, group='accent')
        for y, label in enumerate(['Del','Home','PgUp']):
            row([label], offset+y, x=15.25)
        row(['End'], offset+3, x=15.25)
        row(['Esc'], 0)
        row([f'F{i}' for i in range(1,13)], 0, x=1.25)
        # Reserved bay x=13.6..16.1, y=0..1. It never overlaps a key.
        bay = dict(x=14.85, y=.5, width=2.3, height=.95)
        width, height = 16.25, 6.35
    else:
        row(['Ctrl','Win','Alt','Space','Alt','Win','Menu','Ctrl'], offset+4,
            [1.25]*3+[6.25]+[1.25]*4)
        bay = None
        width, height = 15, 5
        if size == '100':
            # Full ANSI: separated F banks, 3x2 nav, inverted-T, 17-key numpad.
            row(['Esc'], 0)
            for start, x in [(1,2),(5,6.5),(9,11)]:
                row([f'F{i}' for i in range(start,start+4)], 0, x=x)
            row(['PrtSc','ScrLk','Pause'], 0, x=15.75)
            row(['Ins','Home','PgUp'], offset, x=15.75)
            row(['Del','End','PgDn'], offset+1, x=15.75)
            row(['Up'], offset+3, x=16.75, group='accent')
            row(['Left','Down','Right'], offset+4, x=15.75, group='accent')
            row(['Num','/','*','-'], offset, x=19.5)
            row(['7','8','9','+'], offset+1, x=19.5)
            keys[-1]['height'] = 2
            row(['4','5','6'], offset+2, x=19.5)
            row(['1','2','3','Enter'], offset+3, x=19.5)
            keys[-1]['height'] = 2
            row(['0','.'], offset+4, [2,1], x=19.5)
            width, height = 23.5, 6.35
    if size != '60':
        # A function-row Esc is present; ANSI number row starts with grave.
        keys[0]['legend'] = '`'
        keys[0]['group'] = 'alpha'
    # Dedicated bays preserve every existing physical key.
    if size == '60':
        width = 17.6
        bay = dict(x=16.3,y=.6,width=2.3,height=1.05)
    elif size == '100':
        bay = dict(x=21.5,y=.5,width=2.3,height=1.0)
    for k in keys:
        k['code'] = event_code(k,size)
        k['travelMM'] = 3.4
    return dict(id=size, name=f'ANSI {size}%', keys=keys, widthU=width,
                heightU=height, bay=bay, rgbCapable=True, switchMount='MX',
                caseWidthMM=width*U+15, caseDepthMM=height*U+15)


def key_center(k, spec):
    return ((k['x']+k['width']/2-spec['widthU']/2)*U,
            (spec['heightU']/2-k['y']-k['height']/2)*U)


def validate_layout(spec):
    keys = spec['keys']
    assert len({k['id'] for k in keys}) == len(keys), 'Duplicate key IDs'
    assert len({k['code'] for k in keys}) == len(keys), 'Duplicate physical key codes'
    bay=spec['bay']
    for k in keys:
        assert not (min(k['x']+k['width'],bay['x']+bay['width']/2)>max(k['x'],bay['x']-bay['width']/2) and
                    min(k['y']+k['height'],bay['y']+bay['height']/2)>max(k['y'],bay['y']-bay['height']/2)), 'Control bay overlaps key'
    for i, a in enumerate(keys):
        assert a['x'] >= 0 and a['y'] >= 0
        assert a['x']+a['width'] <= spec['widthU']+1e-6
        assert a['y']+a['height'] <= spec['heightU']+1e-6
        for b in keys[i+1:]:
            overlap = (min(a['x']+a['width'],b['x']+b['width'])-max(a['x'],b['x']) > 1e-6 and
                       min(a['y']+a['height'],b['y']+b['height'])-max(a['y'],b['y']) > 1e-6)
            assert not overlap, f"Overlapping keys: {a['id']} / {b['id']}"
    return True


def event_code(k,size):
    label=k['legend']
    if size=='100' and k['x']>=19.5:
        return 'Numpad'+{'Num':'Lock','/':'Divide','*':'Multiply','-':'Subtract','+':'Add','.':'Decimal','Enter':'Enter'}.get(label,label) if label!='Num' else 'NumLock'
    if len(label)==1 and label.isalpha(): return 'Key'+label
    if len(label)==1 and label.isdigit(): return 'Digit'+label
    if label.startswith('F') and label[1:].isdigit(): return label
    if label in ('Shift','Ctrl','Alt','Win'):
        return {'Shift':'Shift','Ctrl':'Control','Alt':'Alt','Win':'Meta'}[label]+('Left' if k['x']<4 else 'Right')
    return {'Esc':'Escape','`':'Backquote','-':'Minus','=':'Equal','[':'BracketLeft',']':'BracketRight',
        '\\':'Backslash',';':'Semicolon',"'":'Quote',',':'Comma','.':'Period','/':'Slash','Caps':'CapsLock',
        'Left':'ArrowLeft','Right':'ArrowRight','Up':'ArrowUp','Down':'ArrowDown','Del':'Delete',
        'Ins':'Insert','PgUp':'PageUp','PgDn':'PageDown','PrtSc':'PrintScreen','ScrLk':'ScrollLock',
        'Menu':'ContextMenu'}.get(label,label)
