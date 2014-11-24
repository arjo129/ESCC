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
var ast = esprima.parse(fs.readFileSync(filename), { loc: true });
//console.log(JSON.stringify(ast));

/**BEGIN: Type analysis system - this subsystem performs type analysis and tries to create traditional c++ classes
 *  converting prototypes to traditional classes. By attempting to do this we reduce the overhead for a compiler 
 *  and we can also check for rogue type conversions. It is not possible to do type analysis at run time given
 *  the memory constraints of the AVR
 */ 

var variableData = function (eman) {
    this.name = eman;
    this.typename = "unknown";
    this.properties = new Array();
    this.propertytype = new Array();
    this.references = new Array();
    this.checkIfPropertyExists = function (property) {
        
    }
    this.scope = new Array();
};
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
var currentFunction; //TODO: Remove this redundant peice of crap
var properties = new Object(); 
var classtree = new Object(); //Hidden class stack
var variableTree = new Object(); //variable stack
var parentFunction = "";
var currscope = ["GLOBAL#@!/"];
var blockScope = ["GLOBAL#@!/"];
var currAddrScope = ["GLOBAL#@!/"];
var currAddrScopeType =["GLOBAL#@!/"];
estraverse.traverse(ast, {  
    enter: function (node, parent) {
        // console.log(JSON.stringify(parent));
        if (node.type == 'BlockStatement') {
            blockScope.push(JSON.stringify(node.loc));
        }

        if (node.type === 'ExpressionStatement') {
            context = "";
        }
        if (node.type === 'FunctionExpression') {
            
            /**
             * Attempts to acertain name and function usage (i.e is it a closure or a FUNCTION|OBJECT)
             */ 
            if (parent.type === "CallExpression" || parent.type === "BinaryExpression") {
                node.dtype = "LambdaExpression";
                currentFunction = "*LAMBDAEXPR&";
                currscope.push(currentFunction);
                blockScope.push(currentFunction);
            }
            else {
                if (parent.type === "AssignmentExpression") {
                    currentFunction = escodegen.generate(parent.left);
                }
                if (parent.type === "VariableDeclarator") {
                    currentFunction = parent.id.name;
                }
                classtree[currentFunction] = new variableData(currentFunction);
                currscope.push(currentFunction);
                blockScope.push(currentFunction);
            }
            
            //Will need fixing
            
        }
        if (node.type === 'FunctionDeclaration') {
            parentFunction = currentFunction;
            currentFunction = node.id.name;
            currscope.push(currentFunction);
            classtree[currentFunction] = new variableData(node.id.name);
        }
        if (node.type === 'Literal') {
            /**
             * Todo: toggle case or smth.
             */ 
            node.dtype = (typeof node.value).toString();
        }
        if (node.type === 'AssignmentExpression') {
            if (node.operator != "=") {
                if (node.operator == "+=") {
                    if (node.right.dtype = undefined) {
                        node.left.dtype = "String|NUMBER";
                    }
                    else {
                        node.left.dtype = node.right.dtype;
                    }
                }
                else {
                    node.left.dtype = "String|NUMBER";
                }
            }
            else {
                node.left.dtype = node.right.dtype;
                node.dtype = node.left.dtype;
                if (node.right.dtype === "ObjectExpression") {
                    classtree[escodegen.generate(node.left)] = new variableData(escodegen.generate(node.left));
                }
            }
        }
        if (node.type === 'BinaryExpression') {
            if (node.operator === "+") {
                inherits = "String|NUMBER";
                LHS = "String|NUMBER";
                RHS = "String|NUMBER";
                node.right.dtype = "String|NUMBER";
                node.left.dtype = "String|NUMBER";
                parent.dtype = "String|NUMBER";
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
            node.dtype = "number";
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
        if (node.type === 'MemberExpression') {
            if(node.object.type!=='ThisExpression'){ currAddrScope.push(node.object);}
            
        }
        if (node.type === 'ArrayExpression') {
            node.dtype = "Array";
        }
        if (node.type === 'ObjectExpression') {
            node.dtype = "OBJECT";
        }
    },
    leave: function (node, parent) {
        if (node.scope === undefined) {
            node.scope = currscope.toString();
           // console.log(node.scope);
        }
        // console.log(node);
        if (node.type === 'ThisExpression') {
            if (currentFunction !== "*LAMBDAEXPR&") {
                if (properties[currentFunction] === undefined) {
                    if (parent.type == "MemberExpression") {
                        classtree[currentFunction].properties.push(parent.property);
                        
                    }
                    //properties[currentFunction] = new Array();
                }
            }
            else {
                console.log("Error: Closure based objects are unsupported for now ;( sorry");
                /**
                 * Handle closure based objects
                 */ 
            }
        }
        if (node.type === 'BinaryExpression') {
            if (node.operator === "+") {
                if (node.right.dtype == "String" || node.left.dtype == "String") {
                    parent.dtype = "String";
                }
            }
        }
        if (node.type == 'VariableDeclarator') {
            if (node.init != undefined) {
                node.dtype = node.init.dtype;
                variableTree[node.id.name] = new variableData(node.id.name);
                if (node.init.type === "ObjectExpression") {
                    classtree[node.id.name] = new variableData(node.id.name);
                    classtree[node.id.name].typename = "OBJECT";
                    for (i =0; i < node.init.properties.length; i++) {
                        classtree[node.id.name].properties.push(node.init.properties[i].key.name);
                        classtree[node.id.name].properties.push(node.init.properties[i].value.dtype);
                    }
                    variableTree[node.id.name].typename = node.id.name;
                    node.dtype = node.id.name;
                }
                else {
                    variableTree[node.id.name].typename = node.init.dtype;
                }
                variableTree[node.id.name].scope = currscope.toString();

            }
        }
        if (node.type == 'FunctionDeclaration') {
            
            //node.parentF = currscope[currscope.length-1];
            classtree[node.id.name].scope = currscope.toString();
            if (properties[node.id.name] != undefined) {
                node.dtype = "Object";
                classtree[node.id.name].typename = "OBJECT";
            }
            else {
                node.dtype = "FUNCTION";//Should evaluate return
                classtree[node.id.name].typename = "FUNCTION";//"FUNCTION";
            }
            currscope.pop();
            currentFunction = currscope[currscope.length - 1];
        }
        if (node.type === 'AssignmentExpression') {
            
            if (node.operator != "=") {
                if (node.operator == "+=") {
                    if (node.right.dtype = undefined) {
                        node.left.dtype = "String|NUMBER";
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
                parent.dtype = node.right.dtype;
                if (node.left.type == "Identifier") {
                    if (variableTree[node.left.name] === undefined) {
                        variableTree[node.left.name] = new variableData(node.left.name);
                        variableTree[node.left.name].typename = node.right.dtype;
                        variableTree[node.left.name].scope = blockScope.toString();
                    }
                    else {
                        variableTree[node.left.name].typename = node.right.dtype;
                    }
                }
                if (node.right.dtype === "ObjectExpression") {
                    classtree[escodegen.generate(node.left)] = new variableData(escodegen.generate(node.left));
                }
            }
        }
        if (node.type === 'FunctionExpression') {
            //  currentFunction = parentFunction;
            if (parent.type === "AssignmentExpression" || parent.type === "VariableDeclarator") {
                node.parentF = currscope[currscope.length - 2];
                if (properties[currentFunction] != undefined) {
                    node.dtype = "Object";
                    try {
                        classtree[currentFunction].typename = "OBJECT";
                        classtree[currentFunction].scope = currscope.toString();
                    } catch (e) {
                        console.log(currentFunction);
                    }
                }
                else {
                    node.dtype = "FUNCTION";
                    try {
                        classtree[currentFunction].typename = "FUNCTION";
                        classtree[currentFunction].scope = currscope.toString();
                    }
                    catch (e) {
                        console.log(currentFunction);
                    }
                }
            }
            currscope.pop();
            currentFunction = currscope[currscope.length - 1];
        }
        if (node.type === 'MemberExpression' && node.computed == true) {
            node.property.dtype = "String|NUMBER";
            currAddrScope.pop();
        }
        
        if (node.type === "BlockStatement") {
            blockScope.pop();
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
//console.log(JSON.stringify(ast));
console.log("Found these hidden classes");
console.log(classtree);
console.log("Found these variables");
console.log(variableTree);