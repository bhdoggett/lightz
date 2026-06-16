import { readdirSync } from 'fs'

const USB_PREFIXES = ['cu.usb', 'cu.usbmodem']

export function listSerialPorts(): string[] {
  try {
    return readdirSync('/dev')
      .filter((name) => USB_PREFIXES.some((p) => name.startsWith(p)))
      .map((name) => `/dev/${name}`)
  } catch {
    return []
  }
}

function isEnttecPort(path: string): boolean {
  return /cu\.usbserial-EN/.test(path)
}

export function findEnttecPort(): string | undefined {
  return listSerialPorts().find(isEnttecPort)
}
