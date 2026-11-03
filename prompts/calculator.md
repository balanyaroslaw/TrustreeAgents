Build a command-line calculator in TypeScript for Node 22.

Behaviour:
- Interactive mode: the program reads expressions from the user repeatedly until
  the user types "exit" or sends EOF.
- Arithmetic on two numbers: addition, subtraction, multiplication, division.
- Trigonometry on a single number: sine, cosine and tangent.
- Trigonometric input is in degrees by default; a --radians flag switches the
  whole session to radians.
- Division by zero is rejected with a clear message and does not terminate the
  program.
- Tangent of 90 degrees and its odd multiples is reported as undefined rather
  than returning a very large float.
- Values that are mathematically zero print as 0: sine of 180 degrees must print
  0, not 1.2246e-16.
- Invalid input (non-numeric values, unknown operators, wrong number of
  arguments) produces a clear error message and the program continues.

Constraints:
- TypeScript, Node 22, no external runtime dependencies. Build and test tooling
  may be dev dependencies.
- The calculation logic lives in a module that can be imported and tested
  independently of the command-line interface.

Done when: the calculator runs from the command line, automated tests cover the
arithmetic, the trigonometric functions, the degrees/radians switch and every
error case listed above, and a README explains how to run it and gives examples.