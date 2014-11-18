/**
 * Created by Arjo Chakravarty on 17/11/2014
 */ 
console.log('ESCC v0.0.1\r\nJS compiler for embedded devices\r\nMIT LICENSE 2013\r\nCopyleft Arjo Chakravarty');
var fs = require('fs');
var esprima = require('esprima'); 
var estraverse = require('estraverse');
var escodegen = require('escodegen');
var filename = process.argv[2]; 
console.log('Processing', filename);
var ast = esprima.parse(fs.readFileSync(filename));
console.log(JSON.stringify(ast));

/**BEGIN: Type analysis system - this subsystem performs type analysis and tries to create traditional c++ classes
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
console.log("Allocated globals.... Begining primary analysis");
var functionlock = false;
/**
 * Pass one, performs "type tagging"... 
 * Implements following:
 * - Operator based type inference [completed]
 * - Method/Object differentiator [completed]
 */ 
var currentFunction;
var properties = new Object();
var classtree = new Object();
estraverse.traverse(ast, {
    enter: function (node, parent) {
        // console.log(JSON.stringify(parent));
        if (node.type === 'ExpressionStatement') {
            context = "";
        }
        if (node.type === 'FunctionExpression') {
            /**
             * Attempts to acertain name and function usage (i.e is it a closure or a FUNCTION|OBJECT)
             */ 
            if (parent.type === "CallExpression" || parent.type === "BinaryExpression") {
                node.dtype = "LambdaExpression";
                currentFuntion = "*LAMBDAEXPR&";
            }
            else {
                if (parent.type === "AssignmentExpression") {
                    currentFunction = escodegen.generate(parent.left);
                }
                if (parent.type === "VariableDeclarator") {
                    currentFunction = escodegen.generate(parent.left);
                }
            }
        }
        if (node.type === 'FunctionDeclaration') {
            currentFunction = node.id.name;
            classtree[currentFunction] = new variableData(node.id.name);
        }
        if (node.type === 'Literal') {
          node.dtype = (typeof node.value).toString().toUpperCase();
        }
        if (node.type === 'AssignmentExpression') {
            if (node.operator != "=") {
                if (node.operator == "+=") {
                    if (node.right.dtype = undefined) {
                        node.left.dtype = "STRING|NUMBER";
                    }
                    else {
                        node.left.dtype = node.right.dtype;
                    }
                }
                else {
                    node.left.dtype = "NUMBER";
                }
            }
            else {
                node.left.dtype = node.right.dtype;
            }
        }
        if (node.type === 'BinaryExpression') {
            if (node.operator === "+") {
                inherits = "STRING|NUMBER";
                LHS = "STRING|NUMBER";
                RHS = "STRING|NUMBER";
                node.right.dtype = "STRING|NUMBER";
                node.left.dtype = "STRING|NUMBER";
                parent.dtype = "STRING|NUMBER";
            }
            else if (node.operator === "-" || node.operator === "*" || node.operator === "/" || node.operator === "%") {
                node.right.dtype = "NUMBER";
                node.left.dtype = "NUMBER";
                parent.dtype = "NUMBER";
            }
            else if (node.operator=== "===" || node.operator === "=!" || node.operator === "==" || node.operator === "!=" || node.operator === "!==") {
                parent.dtype = "BOOLEAN";
            }
            else if (node.operator === ">" || node.operator === "<" || node.operator === ">=" || node.operator === "=>" || node.operator === "<=" || node.operator === "=<") {
                parent.dtype = "BOOLEAN";
                node.right.dtype = "NUMBER";
                node.left.dtype = "NUMBER";
            }
            else if (node.operator === "&" || node.operator === "<<" || node.operator === "^" || node.operator === ">>" || node.operator === "~" || node.operator === ">>>") {
                parent.dtype = "NUMBER";
                node.right.dtype = "BOOLEAN|NUMBER";
                node.left.dtype = "BOOLEAN|NUMBER";
            }
            else if (node.operator === "&&" || node.operator === "||" || node.operator === "!") {
                parent.dtype = "BOOLEAN";
                node.right.dtype = "BOOLEAN";
                node.left.dtype = "BOOLEAN";
            }

        }
        if (node.type === 'UpdateExpression') {

        }
        if (node.type === 'ThisExpression') {
            if (currentFunction !== "*LAMBDAEXPR&") {
                if (properties[currentFunction] === undefined) {
                    if (parent.type = "MemberExpression") {
                         classtree[currentFunction].properties.push(parent.property);
                    }
                    properties[currentFunction] = new Array();
                }
            }
            else {
                console.log("Error: Closure based objects are unsupported for now ;( sorry");
                /**
                 * Handle closure based objects
                 */ 
            }
        }
        if (node.type === 'NewExpression') {
            node.dtype = escodegen.generate(node.callee);
        }
    },
    leave: function (node, parent) {

        if (node.type == 'VariableDeclarator') {
            if (node.init != undefined) {
                node.dtype = node.init.dtype;
            }
        }
        if (node.type == 'FunctionDeclaration') {
            if (properties[node.id.name]!=undefined) {
                node.dtype = "OBJECT";
               // classtree[node.id.name].typename = "OBJECT";
            }
            else {
                node.dtype = "FUNCTION";
               // classtree[node.id.name].typename = "FUNCTION";
            }
        }
        if (node.type === 'AssignmentExpression') {
            if (node.operator != "=") {
                if (node.operator == "+=") {
                    if (node.right.dtype = undefined) {
                        node.left.dtype = "STRING|NUMBER";
                    }
                    else {
                        node.left.dtype = node.right.dtype;
                    }
                }
                else {
                    node.left.dtype = "NUMBER";
                }
            }
            else {
                node.left.dtype = node.right.dtype;
            }
        }
        if (node.type == 'FunctionExpression') {
            if (parent.type === "AssignmentExpression" || parent.type === "VariableDeclarator") {
                if (properties[JSON.stringify(parent.left)] != undefined) {
                    node.dtype = "OBJECT";
                   // classtree[JSON.stringify(parent.left)].typename = "OBJECT";
                }
                else {
                    node.dtype = "FUNCTION";
                    //classtree[JSON.stringify(parent.left)].typename = "FUNCTION";
                }
            }
        }

    }
});
/**
 * Pass two, resolves outstanding conflicts... 
 * Implements following:
 * - Forms the variable/function stack.
 */
estraverse.traverse(ast, {
    enter: function (node, parent) {
        if (node.type = "VariableDeclaration") {
           // var name = node.id.name;
            //variables.push();
        }
    }
});

/**
 * Pass three, translates ... 
 * Implements following:
 * - Operator based type inference
 * - Inheritance based typing
 */  
console.log(JSON.stringify(ast));
console.log(JSON.stringify(classtree));