const { exec } = require('child_process')

const express = require('express')
const app = express()

const Prometheus = require('prom-client')
Prometheus.register.clear()

const gaugeMap = new Map()

/**
 * 
 * @returns { Promise<{ name: string; cpu: number; memory: number }[]> }
 */
function dockerStats() {
  return new Promise((resolve, reject) => {
    exec('docker stats --no-stream  --format "{{.Name}}\t{{.CPUPerc}}\t{{.MemPerc}}"', (error, stdout, stderr) => {

      if (error) {
        reject(error);
      } else {

        const lines = stdout.split('\n')

        const data = [];
        for (const line of lines) {
          if(line) {
            const split = line.split('\t')
            data.push({
              name: String(split[0]),
              cpu: Number(String(split[1]).replace('%', '')),
              memory: Number(String(split[2]).replace('%', ''))
            })
          }
        }

        resolve(data);
      }
    });
  });
}

async function metrics() {
  const data = await dockerStats();

  for (const item of data) {

    // cpu
    const cpuGaugeMapName = 'docker_cpu_' + item.name.split('-').join('_')
    const cpuGaugeMap = gaugeMap.get(cpuGaugeMapName)
    
    if (cpuGaugeMap) {
      cpuGaugeMap.set(item.cpu)
    } else {
      const cpuGauge = new Prometheus.Gauge({
        name: cpuGaugeMapName,
        help: cpuGaugeMapName + '_help',
      })
      cpuGauge.set(item.cpu)
      gaugeMap.set(cpuGaugeMapName, cpuGauge)
    }


    // memory
    const memoryGaugeMapName = 'docker_memory_' + item.name.split('-').join('_')
    const memoryGaugeMap = gaugeMap.get(memoryGaugeMapName)

    if(memoryGaugeMap) {
      memoryGaugeMap.set(item.memory)
    } else {
      const memoryGauge = new Prometheus.Gauge({
        name: memoryGaugeMapName,
        help: memoryGaugeMapName + '_help',
      })
      memoryGauge.set(item.memory)
      gaugeMap.set(memoryGaugeMapName, memoryGauge)
    }
  }

  return await Prometheus.register.metrics()
}

app.get('/', function (req, res) {
  res.send('Hello World')
})

app.get('/metrics', (req, res) => {
  res.set('Content-Type', Prometheus.register.contentType)
  metrics().then((value) => {
    res.end(value)
  }).catch((error) => {
    console.error(error)
    res.end(error)
  });
})

app.listen(9100)
