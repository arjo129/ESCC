
console.log('ESCC v0.0.1\r\nJS compiler for embedded devices\r\nGNU GPL 2013\r\nCopyleft Arjo Chakravarty');
var fs = require('fs');
var esprima = require('esprima');
var estraverse = require('estraverse');
var filename = process.argv[2];
console.log('Processing', filename);
var ast = esprima.parse(fs.readFileSync(filename));
console.log(JSON.stringify(ast));

/*BEGIN: Type analysis system - this subsystem performs type analysis and tries to create traditional c++ classes
 *  converting prototypes to traditional classes. By attempting to do this we reduce the overhead for a compiler 
 *  and we can also check for rogue type conversions. It is not possible to do type analysis at run time given
 *  the memory constraints of the AVR
 */ 

var variableData = function (eman) {
    this.name = eman;
    this.typename = "unknown";
    this.properties = new Array();
    this.propetytype = new Array();
    this.checkIfPropertyExists = function (property) {
        
    }
    this.scope = new String();
};
var variables = new Array(); //This is the variable stack
var parent = "";
var context = "";
LHSType = "";
RHSType = "";
var LHS, RHS, inherits;
console.log("Allocated globals.... Begining primary analysis");
estraverse.traverse(ast, {
    enter: function (node, parent) {
       // console.log(JSON.stringify(parent));
        if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {
        }
        if (node.type === 'Literal') {
          //  node.dtype = (typeof node.value).toString().toUppercase();
        }
        if (node.type === 'BinaryExpression') {
            if (node.operator === "+") {
                inherits = "STRING|NUMERIC";
                LHS = "STRING|NUMERIC";
                RHS = "STRING|NUMERIC";
                node.right.dtype = "STRING|NUMERIC";
                node.left.dtype = "STRING|NUMERIC";
                parent.dtype = "STRING|NUMERIC";
            }
            else if (node.operator === "-" || node.operator === "*" || node.operator === "/" || node.operator === "%") {
                node.right.dtype = "NUMERIC";
                node.left.dtype = "NUMERIC";
                parent.dtype = "NUMERIC";
            }
            else if (node.operator=== "===" || node.operator === "=!" || node.operator === "==" || node.operator === "!=" || node.operator === "!==") {
                parent.dtype = "BOOLEAN";
            }
            else if (node.operator === ">" || node.operator === "<" || node.operator === ">=" || node.operator === "=>" || node.operator === "<=" || node.operator === "=<") {
                parent.dtype = "BOOLEAN";
                node.right.dtype = "NUMERIC";
                node.left.dtype = "NUMERIC";
            }
            else if (node.operator === "&" || node.operator === "<<" || node.operator === "^" || node.operator === ">>" || node.operator === "~" || node.operator === ">>>") {
                parent.dtype = "NUMERIC";
                node.right.dtype = "BOOLEAN|NUMERIC";
                node.left.dtype = "BOOLEAN|NUMERIC";
            }
            else if (node.operator === "&&" || node.operator === "||" || node.operator === "!") {
                parent.dtype = "BOOLEAN";
            }

        }
    },
    leave: function (node, parent) {
        if (node.type == 'VariableDeclarator') { 
           console.log(node.id.name);
        }
        if (node.type == 'FunctionExpression' || node.type == 'FunctionDeclaration') {
        }

    }
});
console.log(JSON.stringify(ast));