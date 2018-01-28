var getSize = require('glsl-matrix-texture')

module.exports = Geometry

function Geometry (opts) {
  var self = this
  if (!(self instanceof Geometry)) return new Geometry(opts)
  self._data = []
  self._idCount = 0
  self._createTexture = opts.createTexture

  self.data = {
    positions: {
      data: new Float32Array(0),
      count: 0
    },
    ids: {
      data: new Float32Array(0),
      count: 0
    },
    elements: {
      data: new Uint32Array(0),
      count: 0
    },
    models: {
      texture: self._createTexture(),
      size: [0,0],
      data: new Float32Array(0),
      update: function () {
        self.data.models.texture({
          data: self.data.models.data,
          format: 'rgba',
          width: self.data.models.size[0],
          height: self.data.models.size[1],
        })
      },
      count: 0
    }
  }
}

Geometry.prototype.add = function (name, mesh) {
  var posCount = getCount(mesh.positions,3)
  this.data.positions.count += posCount*3
  this.data.ids.count += posCount
  var cellCount = getCount(mesh.cells,3)
  this.data.elements.count += cellCount*3
  var id = this._idCount++
  this.data.models.count++
  this._data.push({
    name: name,
    mesh: mesh,
    id: id,
    positionRange: [
      this.data.positions.count - posCount*3,
      this.data.positions.count
    ],
    cellRange: [
      this.data.elements.count - cellCount*3,
      this.data.elements.count
    ]
  })
}

Geometry.prototype.pack = function () {
  this.data.positions.data = new Float32Array(this.data.positions.count)
  this.data.ids.data = new Float32Array(this.data.ids.count)
  this.data.elements.data = new Uint32Array(this.data.elements.count)
  var msize = getSize(this.data.models.count)
  this.data.models.size[0] = msize.width
  this.data.models.size[1] = msize.height
  this.data.models.data = new Float32Array(msize.length)

  for (var i = 0; i < this._data.length; i++) {
    var d = this._data[i]
    var pr = d.positionRange
    var cr = d.cellRange
    this.data.ids.data.subarray(pr[0],pr[1]).fill(d.id)
    if (isFlat(d.mesh.positions)) {
      this.data.positions.data.set(d.mesh.positions,pr[0])
    } else {
      var l = d.mesh.positions.length
      for (var j = 0; j < l; j++) {
        var p = d.mesh.positions[j]
        this.data.positions.data[pr[0]+j*3+0] = p[0]
        this.data.positions.data[pr[0]+j*3+1] = p[1]
        this.data.positions.data[pr[0]+j*3+2] = p[2]
      }
    }
    if (isFlat(d.mesh.cells)) {
      this.data.elements.data.set(d.mesh.cells,cr[0])
    } else {
      var l = d.mesh.cells.length
      for (var j = 0; j < l; j++) {
        var c = d.mesh.cells[j]
        this.data.elements.data[cr[0]+j*3+0] = c[0] + pr[0]/3
        this.data.elements.data[cr[0]+j*3+1] = c[1] + pr[0]/3
        this.data.elements.data[cr[0]+j*3+2] = c[2] + pr[0]/3
      }
    }
  }
}

Geometry.prototype.getId = function (name) {
  var id = this._ids[name]
  return id === undefined ? -1 : id
}

Geometry.prototype.getName = function (id) {
  return this._names[id]
}

function getCount (data, size) {
  return isFlat(data) ? data.length / size : data.length
}

function isFlat (x) { return !Array.isArray(x[0]) }
