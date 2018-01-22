var getSize = require('glsl-matrix-texture')

module.exports = Groups

function Groups (opts) {
  if (!(this instanceof Groups)) return new Groups(opts)
  this.N = 4096
  var msize = getSize(64)
  this.data = {
    positions: new Float32Array(this.N*3),
    cells: new Uint32Array(this.N*3),
    ids: new Float32Array(this.N),
    models: new Float32Array(msize.length),
    modelSize: [msize.width,msize.height],
    modelTexture: null,
    count: 0
  }
  this._mfns = []
  this._updateTexture = opts.texture()
  this._voffsets = { _last: 0 }
  this._eoffsets = { _last: 0 }
  this._ids = { _last: -1 }
  this._lengths = {
    positions: 0,
    cells: 0
  }
}

Groups.prototype.getId = function (name) {
  var id = this._ids[name]
  return id === undefined ? -1 : id
}

Groups.prototype.update = function () {
  for (var i = 0; i < this._mfns.length; i++) {
    var m = this.data.models.subarray(i*16,i*16+16)
    this._mfns[i](m)
  }
  this.data.modelTexture = this._updateTexture({
    data: this.data.models,
    width: this.data.modelSize[0],
    height: this.data.modelSize[1],
    format: 'rgba',
    wrapS: 'clamp',
    wrapT: 'clamp'
  })
}

Groups.prototype.add = function (name, mesh) {
  var positions = f32(mesh.positions)
  var cells = u32(mesh.cells)
  var id = ++this._ids._last
  this._ids[name] = id
  if (id*16 >= this.data.models.length) {
    throw new Error('TODO: resize model array')
  }
  this._mfns[id] = mesh.model

  var free = this.data.positions.length - this._lengths.positions
  if (positions.length > free) {
    throw new Error('TODO: resize vertex array')
    /*
    var n = Math.log2(positions.length + free)
      this._lengths.positions)
    this.data.positions = new Float32Array()
    */
  }
  for (var i = 0; i < cells.length; i++) {
    this.data.cells[i+this._eoffsets._last] = cells[i]
      + this._voffsets._last
  }
  this._eoffsets._last += cells.length
  for (var i = 0; i < positions.length; i++) {
    this.data.positions[i+this._voffsets._last*3] = positions[i]
  }
  for (var i = 0; i < positions.length/3; i++) {
    this.data.ids[i+this._voffsets._last] = id
  }
  this.data.count += cells.length
  this._voffsets[name] = this._voffsets._last
  this._voffsets._last += positions.length/3
}

function istarray (x) {
  return typeof x.subarray === 'function'
}

function f32 (x) {
  if (istarray(x)) return x
  var isFlat = Array.isArray(x[0]) ? false : true
  if (isFlat) return Float32Array.from(x)
  var dim = x[0].length
  var out = new Float32Array(x.length * dim)
  var index = 0
  for (var i = 0; i < x.length; i++) {
    for (var j = 0; j < x[i].length; j++) {
      out[index++] = x[i][j]
    }
  }
  return out
}

function u32 (x) {
  if (istarray(x)) return x
  var isFlat = Array.isArray(x[0]) ? false : true
  if (isFlat) return Uint32Array.from(x)
  var dim = x[0].length
  var out = new Uint32Array(x.length * dim)
  var index = 0
  for (var i = 0; i < x.length; i++) {
    for (var j = 0; j < x[i].length; j++) {
      out[index++] = x[i][j]
    }
  }
  return out
}
