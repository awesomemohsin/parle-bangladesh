import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')

export class FileStorage {
  static init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
  }

  static ensureDir(filePath: string) {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  static read<T>(filePath: string): T | null {
    try {
      const fullPath = path.join(DATA_DIR, filePath)
      if (!fs.existsSync(fullPath)) return null
      const content = fs.readFileSync(fullPath, 'utf-8')
      return JSON.parse(content) as T
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error)
      return null
    }
  }

  static write<T>(filePath: string, data: T): boolean {
    try {
      const fullPath = path.join(DATA_DIR, filePath)
      this.ensureDir(fullPath)
      fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8')
      return true
    } catch (error) {
      console.error(`Error writing ${filePath}:`, error)
      return false
    }
  }

  static append<T>(filePath: string, data: T): boolean {
    try {
      const fullPath = path.join(DATA_DIR, filePath)
      this.ensureDir(fullPath)
      const existing = this.read<T[]>(filePath) || []
      const updated = Array.isArray(existing) ? [...existing, data] : [data]
      fs.writeFileSync(fullPath, JSON.stringify(updated, null, 2), 'utf-8')
      return true
    } catch (error) {
      console.error(`Error appending to ${filePath}:`, error)
      return false
    }
  }

  static delete(filePath: string): boolean {
    try {
      const fullPath = path.join(DATA_DIR, filePath)
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath)
        return true
      }
      return false
    } catch (error) {
      console.error(`Error deleting ${filePath}:`, error)
      return false
    }
  }

  static exists(filePath: string): boolean {
    const fullPath = path.join(DATA_DIR, filePath)
    return fs.existsSync(fullPath)
  }

  static listDir(dirPath: string): string[] {
    try {
      const fullPath = path.join(DATA_DIR, dirPath)
      if (!fs.existsSync(fullPath)) return []
      return fs.readdirSync(fullPath)
    } catch (error) {
      console.error(`Error listing ${dirPath}:`, error)
      return []
    }
  }

  static readDir<T>(dirPath: string): T[] {
    try {
      const fullPath = path.join(DATA_DIR, dirPath)
      if (!fs.existsSync(fullPath)) return []
      
      const files = fs.readdirSync(fullPath)
      const results: T[] = []
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(dirPath, file)
          const data = this.read<T>(filePath)
          if (data) results.push(data)
        }
      }
      
      return results
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error)
      return []
    }
  }

  static update<T>(filePath: string, updateFn: (data: T | null) => T): boolean {
    try {
      const current = this.read<T>(filePath)
      const updated = updateFn(current)
      return this.write(filePath, updated)
    } catch (error) {
      console.error(`Error updating ${filePath}:`, error)
      return false
    }
  }
}
