import { networkInterfaces } from 'os'
import dotenv from 'dotenv'

dotenv.config()

const networkInterfaceName = process.env.networkInterfaceName
if (!networkInterfaceName) {
  throw new Error('No network interface specified')
}
const networkInterface = networkInterfaces()[networkInterfaceName];
if (!networkInterface) {
  throw new Error(`Network interface ${networkInterfaceName} not found`);
}

let ipv4Address = ''
let ipv6Address = ''
let updateRequired = true

const apiKey = process.env.apiKey ?? ''
const zoneId = process.env.zoneId ?? ''
const ipv4RecordId = process.env.ipv4RecordId ?? ''
const ipv6RecordId = process.env.ipv6RecordId ?? ''
const sleepValue: string | undefined = process.env.sleepTime;
let sleep: number = 300000
if (sleepValue !== undefined && !isNaN(Number(sleepValue))) {
  sleep = Number(sleepValue);
}

// Get public IP addresses
async function getIPs() {
try {
  // Get public IPv4 address
  const response = await fetch('https://api.ipify.org/?format=json')
  const json = await response.json()
  if (ipv4Address !== json.ip) {
    ipv4Address = json.ip
    updateRequired = true
  }

  // Get IPv6 address
  if (networkInterface) {
    const ip = networkInterface[1].address
    if (ipv6Address !== ip) {
      ipv6Address = ip
      updateRequired = true
    }
  } else {
    throw new Error('No network interface specified')
  }
  console.log(`Current public IP addresses on interface ${networkInterfaceName}: \n ${ipv4Address} \n ${ipv6Address}`)
} catch (error) {
  if (error instanceof Error) {
    console.error(`Error getting public IP addresses: ${error.message}`)}
}
}

// Update DNS records
async function updateDNS(recordId: string, newAddress: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        content: newAddress,
      }),
    });
    const data = await response.json();
    console.log(data);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error updating DNS record: ${error.message}`)
    }
    return false;
  }
}

async function main() {
  // Get IP addresses
  await getIPs()
  if (updateRequired) {
    // Update DNS records
    console.log('Updating DNS records...')
    const output1 =  await updateDNS(ipv4RecordId, ipv4Address)
    const output2 = await updateDNS(ipv6RecordId, ipv6Address)
    if (output1 && output2) {
      console.log('Update successful')
      updateRequired = false
    }
  } else {
    console.log('No update required')
  }
  // Wait 5 minutes
  setTimeout(main, sleep)
}

main()