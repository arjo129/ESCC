# ESCC
ESCC is an *attempt* at transcompiling javascript, a dynamic prototype based language to c++, a static class based language. It attempts to infer types through static analysis. It uses a number of techniques to infer types including operator based inference, inheritance based inference, comparator based inference and other techniques. As of now its a work in progress which goes through the ESprima parse tree and tags symbols according to their type. Ideally I should be able to write javascript code and be able to execute the result on an 8 bit processor.

