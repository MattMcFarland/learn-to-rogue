const Chance = require('chance')
const range = require('fill-range')
const plotLine = require('bresenham-js')
const config = {
  seed: undefined,
  mapWidth: 150,
  mapHeight: 25,
  minRoomWidth: 16,
  minRoomHeight: 6,
  maxRoomWidth: 23,
  maxRoomHeight: 12
}
const chance = Chance(config.seed)

const myCoolMap = initMap(config)
const rooms = createRooms(myCoolMap, config)
connectRooms(myCoolMap, rooms)
createCooridoors(myCoolMap, rooms)
printMap(myCoolMap)

function initMap({mapWidth, mapHeight}) {
  return fillRect([], 1, 0, 0, mapWidth, mapHeight)
}

function createRooms(area, options) {
  const {
    mapWidth,
    mapHeight,
    minRoomWidth,
    minRoomHeight,
    maxRoomWidth,
    maxRoomHeight } = options
  const maxRooms = getMapCapacity(mapWidth - minRoomWidth, mapHeight - minRoomHeight, maxRoomWidth + minRoomWidth, maxRoomHeight + minRoomHeight)
  if (maxRooms < 1) return {}
  const maxColumns = Math.floor(mapWidth / maxRoomWidth)
  const maxRows = Math.floor(mapHeight / maxRoomHeight)

  const grid = createHashGrid(maxColumns, maxRows, (col, row) => {
    const width = chance.natural({ min: minRoomWidth, max: maxRoomWidth })
    const height = chance.natural({ min: minRoomHeight, max: maxRoomHeight })
    const offsetX = Math.max(1, Math.floor(mapWidth % maxRoomWidth/2) +  Math.max(1,Math.floor(maxRoomWidth % width)))
    const offsetY =  Math.max(1, Math.floor(mapHeight % maxRoomHeight/2) +  Math.max(1, Math.floor(maxRoomHeight % height)))
    const mapX = (offsetX + col * maxRoomWidth)
    const mapY = (offsetY + row * maxRoomHeight)
    const x2 = mapX + width - 2
    const y2 = mapY + height - 2
    const rect = [mapX, mapY, x2, y2]
    digRect(area, 0, mapX, mapY, x2, y2)
    return { width, height, mapX, mapY, rect, connections: [] }
  })
  return grid
}

function createCooridoors(area, rooms) {
  Object.keys(rooms).forEach((roomKey) => {
    const room = rooms[roomKey]
    room.connections.forEach(otherRoomKey => {
      const otherRoom = rooms[otherRoomKey]
      const pointA = {
        x: chance.pickone(range(room.rect[0], room.rect[2])),
        y: chance.pickone(range(room.rect[1], room.rect[3]))
      }
      const pointB = {
        x: chance.pickone(range(otherRoom.rect[0], otherRoom.rect[2])),
        y: chance.pickone(range(otherRoom.rect[1], otherRoom.rect[3]))
      }

      room.connected = true
      otherRoom.connected = true

      let points = plotLine([pointA.x, pointA.y], [pointB.x, pointB.y])
      points.forEach(([px, py]) => {
        let widen = chance.pickone([-1, 1, 0])
        if (area[px + widen]) area[px + widen][py] = 0
        widen = chance.pickone([-1, 1])
        if (area[px + widen]) area[px + widen][py] = 0
        area[px][py] = 0
      })
    })
  })
}

function fillRect(area, value, x, y, x2, y2) {
  for (let _x = x; _x < x2; _x++) {
    for (let _y = y; _y < y2; _y++) {
      area[_x] || (area[_x] = [])
      area[_x][_y] = value
    }
  }
  return area
}

function digRect(area, value, x, y, x2, y2) {
  for (let _x = x; _x < x2; _x++) {
    for (let _y = y; _y < y2; _y++) {
      area[_x] || (area[_x] = [])
      const isCorner = (_x === x || _x === x2 - 1) && (_y === y || _y === y2 - 1)
      const isEdge = !isCorner && (_x === x || _x === x2 - 1) || (_y === y || _y === y2 - 1)
      const previousIsWall = area[_x - 1][_y] === 1
      area[_x][_y] = isCorner ? chance.pickone([0, 1]) : previousIsWall && isEdge ? chance.pickone([0, 1]) : value
    }
  }
}

function connectRooms(area, rooms) {
  // pick one room, find a neighbor, then pick the next one, then find another neighbor, then pick another one, then find another neighbor, until this is exhausted.
  const UP = [0, -1]
  const DOWN = [0, 1]
  const LEFT = [-1, 0]
  const RIGHT = [1, 0]
  const getRelativeRoomKey = (relKey, direction) => {
    const relXY = relKey.split(':').map(toInt)
    const [relX, relY] = relXY
    const [dirX, dirY] = direction
    return [relX + dirX, relY + dirY].join(':')
  }
  let roomKey = chance.pickone(Object.keys(rooms))
  let directions = chance.shuffle([UP, DOWN, LEFT, RIGHT])
  let connectPath = [roomKey]
  do {
    let targetCoords = getRelativeRoomKey(roomKey, chance.pickone(directions))
    if (rooms[targetCoords] && connectPath.indexOf(targetCoords) == -1) {
      connectPath.push(targetCoords)
      rooms[roomKey].connections.push(targetCoords)
      roomKey = connectPath[connectPath.length - 1]
      directions = chance.shuffle([UP, DOWN, LEFT, RIGHT])
    }
    directions.shift()
  } while (directions.length)
  let unConnectedRooms = Object.keys(rooms).filter((roomKey) => rooms[roomKey].connections.length === 0)
  directions = chance.shuffle([UP, DOWN, LEFT, RIGHT])
  do {
    if (directions.length === 0) break;
    unConnectedRooms = Object.keys(rooms).filter((roomKey) => rooms[roomKey].connections.length === 0)
    unConnectedRooms.forEach(roomKey => {
      directions = chance.shuffle([UP, DOWN, LEFT, RIGHT])
      do {
        let targetCoords = getRelativeRoomKey(roomKey, chance.pickone(directions))
        if (rooms[targetCoords]
          && rooms[roomKey].connections.indexOf(targetCoords) === -1
          && rooms[targetCoords].connections.indexOf(roomKey) === -1) {
          rooms[roomKey].connections.push(targetCoords)
          directions = chance.shuffle([UP, DOWN, LEFT, RIGHT])
          break;
        }
        directions.shift()
      } while (directions.length)
    })
  } while (unConnectedRooms.length)
  //rooms
}

function toInt (str) { return parseInt(str) }

function getMapCapacity(mapWidth, mapHeight, maxRoomWidth, maxRoomHeight) {
  return Math.floor((mapWidth / maxRoomWidth) * (mapHeight / maxRoomHeight))
}

function createHashGrid (columnLength, rowLength, value) {
  const result = {}
  for (let col = 0; col < columnLength; col++) {
    for (let row = 0; row < rowLength; row++) {
      result[`${col}:${row}`] = typeof value === 'function' ? value(col, row) : value
    }
  }
  return result
}

function transposeArray(array) {
  return array.map((col, i) =>
    array.reduce(function (acc, row) {
      if (row[i] >= 0)
        acc.push(row[i])
      return acc
    }, [])
  );
}

function printMap(map) {
  str = ''
  transposeArray(map).forEach((row, y) => {
    row.forEach((value, x) => {
      str += value === 1 ? 'x' : '.'
      if (x === config.mapWidth-1) str += '\n'
    })
  })
  console.log(str)
}
