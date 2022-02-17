const { exec } = require('child_process')

const express = require('express')
const app = express()

const Prometheus = require('prom-client')
Prometheus.register.clear()

const cpuGauge = new Prometheus.Gauge({
  name: 'docker_cpu',
  help: 'docker_cpu_help',
  labelNames: ['name']
})

const memoryGauge = new Prometheus.Gauge({
  name: 'docker_memory',
  help: 'docker_memory_help',
  labelNames: ['name']
})

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
          if (line) {
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
    cpuGauge.labels(item.name).set(item.cpu);
    memoryGauge.labels(item.name).set(item.memory);
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
