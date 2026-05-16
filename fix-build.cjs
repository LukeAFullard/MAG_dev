const fs = require('fs');

let code = fs.readFileSync('src/components/ManualAnnotation.tsx', 'utf8');

// The error is: src/components/ManualAnnotation.tsx(44,22): error TS2554: Expected 1 arguments, but got 0.
// This is useRef<number>(). In React, if you don't pass an initial value to useRef, the type might expect one if strict null checks or types are strict.
// It should be useRef<number>(undefined) or useRef<number | null>(null) or just useRef<number>(0).
// Since requestAnimationFrame returns a number, it's safer to do useRef<number | undefined>(undefined). Let's see what the line is:
// const requestRef = useRef<number>();
code = code.replace("const requestRef = useRef<number>();", "const requestRef = useRef<number | undefined>(undefined);");

fs.writeFileSync('src/components/ManualAnnotation.tsx', code);
