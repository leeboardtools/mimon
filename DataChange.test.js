//import { dataChange } from './DataChange';
import {dataChange, resolveDataPath, resolveDataPathWithInfo, } from './DataChange';


//
//---------------------------------------------------------
//
test('dataChange', () => {
    let result;
    let result2;

    const a = {
        abc: 'abc',
        def: 'def',
        ghi: 'ghi',
    };

    result = dataChange(a, {});
    expect(result).toEqual({
        updatedObject: a,
        savedChanges: {},
    });


    result = dataChange(a, {
        def: 'DEF',
        xyz: 'XYZ',
    });
    expect(result).toEqual({
        updatedObject: {
            abc: 'abc',
            def: 'DEF',
            ghi: 'ghi',
            xyz: 'XYZ',
        },
        savedChanges: {
            changes:  {
                def: 'def',
                xyz: undefined,
            },
        },
    });

    result2 = dataChange(result);
    expect(result2).toEqual({
        updatedObject: a,
        savedChanges: {
            changes: {
                def: 'DEF',
                xyz: 'XYZ',
            },
        },
    });

    result = dataChange({
        original: result.updatedObject, 
        savedChanges: result.savedChanges,
    });
    expect(result).toEqual({
        updatedObject: a,
        savedChanges: {
            changes: {
                def: 'DEF',
                xyz: 'XYZ',
            },
        },
    });


    const b = {
        abc: 'abc',
        def: undefined,
        ghi: 'ghi',
    };
    result = dataChange(b, { def: 'DEF', });
    expect(result).toEqual({
        updatedObject: {
            abc: 'abc',
            def: 'DEF',
            ghi: 'ghi',
        },
        savedChanges: {
            changes: {
                def: undefined,
            },
        },
    });

    result = dataChange({
        original: result.updatedObject, 
        savedChanges: result.savedChanges,
    });
    expect(result).toEqual({
        updatedObject: {
            abc: 'abc',
            ghi: 'ghi',
        },
        savedChanges: {
            changes: {
                def: 'DEF',
            },
        }
    });


    // Inner objects...
    const c = {
        abc: 'abc',
        objDef: {
            lmn: 'lmn',
            pqr: 'pqr',
            objStu: {
                aaa: 'aaa',
                bbb: 'bbb',
            }
        }
    };
    result = dataChange(c, { objDef: { objStu: '123'}});
    expect(result).toEqual({
        updatedObject: {
            abc: 'abc',
            objDef: {
                objStu: '123',
            }
        },
        savedChanges: {
            changes: {
                objDef: {
                    lmn: 'lmn',
                    pqr: 'pqr',
                    objStu: {
                        aaa: 'aaa',
                        bbb: 'bbb',
                    }
                }
            },
        }
    });

    result2 = dataChange(result);
    expect(result2).toEqual({
        updatedObject: c,
        savedChanges: {
            changes: {
                objDef: {
                    objStu: '123',
                }
            }
        }
    });
});


//
//---------------------------------------------------------
//
test('dataChange-arrayScenarios', () => {
    let result;

    const array = [1, 2, 3];

    const changesArray = ['a', 'b'];

    result = dataChange(array, changesArray);
    expect(result).toEqual({
        updatedObject: changesArray,
        savedChanges: {
            changes: array,
        }
    });

    result = dataChange(result);
    expect(result.updatedObject).toEqual(array);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(changesArray);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(array);


    const changesObject = { a: 'abc', };
    result = dataChange(array, changesObject);
    expect(result).toEqual({
        updatedObject: changesObject,
        savedChanges: {
            changes: array,
        }
    });

    result = dataChange(result);
    expect(result.updatedObject).toEqual(array);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(changesObject);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(array);


    result = dataChange(array, {});
    expect(result).toEqual({
        updatedObject: {},
        savedChanges: {
            changes: array,
        }
    });

    result = dataChange(result);
    expect(result.updatedObject).toEqual(array);

    result = dataChange(result);
    expect(result.updatedObject).toEqual({});

    result = dataChange(result);
    expect(result.updatedObject).toEqual(array);


    const changedValue = 'abc';

    result = dataChange(array, changedValue);
    expect(result).toEqual({
        updatedObject: changedValue,
        savedChanges: {
            changes: array,
        }
    });

    result = dataChange(result);
    expect(result.updatedObject).toEqual(array);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(changedValue);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(array);
});


//
//---------------------------------------------------------
//
test('dataChange-objectScenarios', () => {
    let result;

    const object = {
        a: 'abc',
        b: 'bcd',
    };

    const changesArray = ['a', 'b'];

    result = dataChange(object, changesArray);
    expect(result).toEqual({
        updatedObject: changesArray,
        savedChanges: {
            changes: object,
        }
    });

    result = dataChange(result);
    expect(result.updatedObject).toEqual(object);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(changesArray);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(object);


    const changesObject = { a: 'ABC', };
    const changedObject = Object.assign({}, object, changesObject);

    result = dataChange(object, changesObject);
    expect(result).toEqual({
        updatedObject: changedObject,
        savedChanges: {
            changes: {
                a: 'abc',
            },
        }
    });

    result = dataChange(result);
    expect(result.updatedObject).toEqual(object);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(changedObject);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(object);


    // changes = {} requires an empty changesPath...
    result = dataChange(object, {}, []);
    expect(result).toEqual({
        updatedObject: {},
        savedChanges: {
            changes: object,
            changesPath: [],
        }
    });

    result = dataChange(result);
    expect(result.updatedObject).toEqual(object);

    result = dataChange(result);
    expect(result.updatedObject).toEqual({});

    result = dataChange(result);
    expect(result.updatedObject).toEqual(object);


    const changedValue = 'abc';

    result = dataChange(object, changedValue);
    expect(result).toEqual({
        updatedObject: changedValue,
        savedChanges: {
            changes: object,
        }
    });

    result = dataChange(result);
    expect(result.updatedObject).toEqual(object);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(changedValue);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(object);
});


//
//---------------------------------------------------------
//
test('dataChange-emptyObjectScenarios', () => {
    let result;

    const object = {};

    const changesArray = ['a', 'b'];

    result = dataChange(object, changesArray);
    expect(result).toEqual({
        updatedObject: changesArray,
        savedChanges: {
            changes: object,
        }
    });

    result = dataChange(result);
    expect(result.updatedObject).toEqual(object);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(changesArray);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(object);


    const changesObject = { a: 'ABC', };
    const changedObject = Object.assign({}, object, changesObject);

    result = dataChange(object, changesObject);
    expect(result).toEqual({
        updatedObject: changedObject,
        savedChanges: {
            changes: {
                a: undefined,
            },
            changesPath: [],
        }
    });

    result = dataChange(result);
    expect(result.updatedObject).toEqual(object);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(changedObject);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(object);


    // changes = {} requires an empty changesPath...
    result = dataChange(object, {}, []);
    expect(result).toEqual({
        updatedObject: {},
        savedChanges: {
            changes: object,
            changesPath: [],
        }
    });

    result = dataChange(result);
    expect(result.updatedObject).toEqual(object);

    result = dataChange(result);
    expect(result.updatedObject).toEqual({});

    result = dataChange(result);
    expect(result.updatedObject).toEqual(object);


    const changedValue = 'abc';

    result = dataChange(object, changedValue);
    expect(result).toEqual({
        updatedObject: changedValue,
        savedChanges: {
            changes: object,
        }
    });

    result = dataChange(result);
    expect(result.updatedObject).toEqual(object);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(changedValue);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(object);

});


//
//---------------------------------------------------------
//
test('dataChange-fullPaths', () => {
    let result;

    const a = {
        b: 123,
        c: {
            d: 'd',
            e: [
                0,
                {
                    f: 'f',
                    g: [
                        [
                            100, 
                            101, 
                            {
                                i: 'i',
                            }, 
                        ],
                        'g',
                        {
                            h: 'h',
                        }
                    ]
                },
                2,
            ],
        }
    };

    // Assignment of {}
    result = dataChange(a, {}, []);
    expect(result.updatedObject).toEqual({});

    result = dataChange(result);
    expect(result.updatedObject).toEqual(a);

    result = dataChange(result);
    expect(result.updatedObject).toEqual({});

    result = dataChange(result);
    expect(result.updatedObject).toEqual(a);


    // Path fully exists
    const ref_1 = {
        b: 123,
        c: {
            d: 'd',
            e: [
                0,
                123,
                2,
            ],
        }
    };
    result = dataChange(a, 123, ['c', 'e', 1]);
    expect(result.updatedObject).toEqual(ref_1);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(a);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(ref_1);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(a);
    

    const change_2 = {
        z: 'Z',
        y: [1, 2, 3],
    };
    const ref_2 = {
        b: 123,
        c: {
            d: 'd',
            e: Object.assign({}, change_2),
        }
    };
    result = dataChange(a, change_2, ['c', 'e']);
    expect(result.updatedObject).toEqual(ref_2);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(a);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(ref_2);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(a);


    // Array in array
    const change_3 = {
        z: 'Z',
        y: [1, 2, 3],
    };
    const ref_3 = {
        b: 123,
        c: {
            d: 'd',
            e: [
                0,
                {
                    f: 'f',
                    g: [
                        [
                            100, 
                            Object.assign({}, change_3), 
                            {
                                i: 'i',
                            }, 
                        ],
                        'g',
                        {
                            h: 'h',
                        }
                    ]
                },
                2,
            ],
        }
    };
    result = dataChange(a, change_3, ['c', 'e', 1, 'g', 0, 1]);
    expect(result.updatedObject).toEqual(ref_3);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(a);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(ref_3);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(a);


    const b = [
        0,
        { 
            c: [ 
                100, 
                { 
                    d: { 
                        e: 123,
                    },
                },
            ],
        },
        2,
    ];

    const change_4 = [1, 2, 3];
    const ref_4 = [
        0,
        { 
            c: [ 
                Array.from(change_4), 
                { 
                    d: { 
                        e: 123,
                    },
                },
            ],
        },
        2,
    ];
    result = dataChange(b, change_4, [1, 'c', 0, ]);
    expect(result.updatedObject).toEqual(ref_4);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(b);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(ref_4);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(b);


    //
    // assignChanges
    const c = {
        a: {
            b: {
                c: 123,
                d: 456,
            },
            c: {
                g: {
                    h: 'H',
                },
            },
        },
    };

    const change_5 = {
        g: {
            j: '123',
        }
    };
    const ref_5 = {
        a: {
            b: {
                c: 123,
                d: 456,
                g: {
                    j: '123',
                },
            },
            c: {
                g: {
                    h: 'H',
                },
            },
        },
    };
    result = dataChange({
        original: c,
        changes: change_5,
        changesPath: ['a', 'b'],
        assignChanges: true,
    });
    expect(result.updatedObject).toEqual(ref_5);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(c);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(ref_5);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(c);


    const ref_6 = {
        a: {
            b: {
                c: 123,
                d: 456,
            },
            c: Object.assign({}, change_5),
        },
    };
    result = dataChange({
        original: c,
        changes: change_5,
        changesPath: ['a', 'c'],
        assignChanges: true,
    });
    expect(result.updatedObject).toEqual(ref_6);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(c);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(ref_6);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(c);
});


//
//---------------------------------------------------------
//
test('dataChange-partialPaths', () => {
    let result;

    const a = {
        b: [
            {
                c: {
                    d: [
                        1,
                        2,
                        3
                    ],
                    e: {
                        f: 'f',
                    },
                }
            },
            [
                200, 
                300 
            ],
            3,
        ],
        g: {
            h: {
                i: 'i',
                j: 'j',
            },
            k: 123,
        }
    };

    //
    // property not exist in object.
    const change_1 = { z: 'Z' };
    const ref_1 = {
        b: [
            {
                c: {
                    d: [
                        1,
                        2,
                        3
                    ],
                    e: {
                        f: 'f',
                    },
                    x: {
                        y: Object.assign({}, change_1),
                    },
                }
            },
            [
                200, 
                300 
            ],
            3,
        ],
        g: {
            h: {
                i: 'i',
                j: 'j',
            },
            k: 123,
        }
    };

    result = dataChange(a, change_1, ['b', 0, 'c', 'x', 'y']);
    expect(result.updatedObject).toEqual(ref_1);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(a);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(ref_1);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(a);


    // array instead of object.
    const ref_2 = {
        b: [
            {
                c: {
                    d: [
                        1,
                        2,
                        3
                    ],
                    e: {
                        f: 'f',
                    },
                }
            },
            {
                x: {
                    y: Object.assign({}, change_1),
                },
            },
            3,
        ],
        g: {
            h: {
                i: 'i',
                j: 'j',
            },
            k: 123,
        }
    };
    result = dataChange(a, change_1, ['b', 1, 'x', 'y']);
    expect(result.updatedObject).toEqual(ref_2);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(a);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(ref_2);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(a);


    // beyond array bounds
    const ref_3 = {
        b: [
            {
                c: {
                    d: [
                        1,
                        2,
                        3
                    ],
                    e: {
                        f: 'f',
                    },
                }
            },
            [
                200, 
                300,
                undefined,
                {
                    y: Object.assign({}, change_1),
                }
            ],
            3,
        ],
        g: {
            h: {
                i: 'i',
                j: 'j',
            },
            k: 123,
        }
    };
    result = dataChange(a, change_1, ['b', 1, 3, 'y']);
    expect(result.updatedObject).toEqual(ref_3);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(a);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(ref_3);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(a);


    // dest is not array.
    const ref_4 = {
        b: [
            {
                c: {
                    d: [
                        1,
                        2,
                        3
                    ],
                    e: {
                        f: 'f',
                    },
                }
            },
            [
                200, 
                300 
            ],
            3,
        ],
        g: [
            undefined,
            Object.assign({}, change_1)
        ],
    };
    result = dataChange(a, change_1, ['g', 1]);
    expect(result.updatedObject).toEqual(ref_4);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(a);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(ref_4);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(a);


    // multilevel array
    const ref_5 = {
        b: [
            {
                c: {
                    d: [
                        1,
                        2,
                        3
                    ],
                    e: {
                        f: 'f',
                    },
                }
            },
            [
                200, 
                300 
            ],
            [
                undefined,
                {
                    y: Object.assign({}, change_1),
                },
            ],
        ],
        g: {
            h: {
                i: 'i',
                j: 'j',
            },
            k: 123,
        }
    };
    result = dataChange(a, change_1, ['b', 2, 1, 'y']);
    expect(result.updatedObject).toEqual(ref_5);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(a);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(ref_5);

    result = dataChange(result);
    expect(result.updatedObject).toEqual(a);
});


test('resolveDataPathWithInfo', () => {
    let result;

    const a = {
        b: {
            c: {
                d: [
                    10,
                    {
                        e: [
                            100,
                            {
                                f: 'F',
                            }
                        ]
                    },
                    [
                        1000,
                        2000,
                        {
                            g: 'G',
                        },
                    ]
                ],
                h: 'H',
            },
            i: {
                j: 'J',
            }
        },
    };
    result = resolveDataPathWithInfo(a, ['b', 'i', 'j']);
    expect(result).toEqual({
        resolvedItem: 'J',
        pathIndex: 3,
    });

    expect(resolveDataPath(a, ['b', 'i', 'j'])).toEqual('J');


    result = resolveDataPathWithInfo(a, ['b', 1, 2]);
    expect(result).toEqual({
        pathIndex: 1,
    });
    expect(resolveDataPath(a, ['b', 1, 2])).toBeUndefined();


    result = resolveDataPathWithInfo(a, ['b', 'c', 'd', 0]);
    expect(result).toEqual({
        resolvedItem: 10,
        pathIndex: 4,
    });
    expect(resolveDataPath(a, ['b', 'c', 'd', 0])).toEqual(10);


    result = resolveDataPathWithInfo(a, ['b', 'c', 'd', 2, 2]);
    expect(result).toEqual({
        resolvedItem: { g: 'G', },
        pathIndex: 5,
    });
    expect(resolveDataPath(a, ['b', 'c', 'd', 2, 2])).toEqual({ g: 'G', });

    // array index out of range
    result = resolveDataPathWithInfo(a, ['b', 'c', 'd', 3, 'e']);
    expect(result).toEqual({
        pathIndex: 3,
    });
    expect(resolveDataPath(a, ['b', 'c', 'd', 3, 'e'])).toBeUndefined();
});
