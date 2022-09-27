import {OperatingSystem} from '../operating_system'
import {Class} from '../utility'
import {isValid} from './factory'

export class Kind {
  readonly name: string

  private constructor(name: string) {
    this.name = name
  }

  static for(name: string): Kind {
    const canonicalizeName = Kind.canonicalize(name)

    if (!isValid(canonicalizeName))
      throw Error(`Unrecognized operating system: ${name}`)

    return new Kind(canonicalizeName)
  }

  is(classObject: Class<OperatingSystem>): boolean {
    return this.name === Kind.canonicalize(classObject.name)
  }

  private static canonicalize(name: string): string {
    return name.toLocaleLowerCase()
  }
}
