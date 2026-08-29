<div align="center">

# `@nestjslatam/ddd-es-lib`

**Event sourcing y CQRS para [`@nestjslatam/ddd-lib`](https://github.com/nestjslatam/ddd)** — event store, snapshots, upcasting, sagas y vistas materializadas, sobre NestJS.

[![npm](https://img.shields.io/npm/v/%40nestjslatam%2Fddd-es-lib?color=1e73be&label=ddd-es-lib)](https://www.npmjs.com/package/@nestjslatam/ddd-es-lib)
[![CI](https://github.com/nestjslatam/ddd-event-sourcing/actions/workflows/ci.yml/badge.svg)](https://github.com/nestjslatam/ddd-event-sourcing/actions/workflows/ci.yml)
[![tests](https://img.shields.io/badge/pruebas-183%20pasando%20·%20sin%20base%20de%20datos-00d084)](#ejecutar-las-pruebas)
[![license](https://img.shields.io/badge/licencia-MIT-575760)](LICENSE)

[Lee esto primero](#lee-esto-primero) · [Qué hace](#qué-hace) · [Preguntas frecuentes](#preguntas-frecuentes) · [Limitaciones conocidas](#limitaciones-conocidas) · [Colaborar](#colaborar)

**[📖 Documentación en docs.nestjslatam.dev](https://docs.nestjslatam.dev/event-sourcing/)**

</div>

---

> [!CAUTION]
> **La API pública todavía es inestable — clava una versión exacta.** Los dos huecos de cableado están cerrados: los eventos confirmados llegan a tus proyectores y el driver `mongo` arranca. Ninguno de los dos lo ejercitaba jamás la batería de pruebas, y por eso la `1.4.0` incluye también el script que sí los ejercita. Lee [Limitaciones conocidas](#limitaciones-conocidas) entera antes de adoptarlo.

## Lee esto primero

Este README no vende la librería por encima de lo que es, y eso es deliberado. Cada limitación de abajo se reprodujo ejecutándola, y el [`libs/es/README.md`](libs/es/README.md) que va a npm lleva el mismo catálogo con el texto exacto del error y la causa raíz leída del fuente para cada una.

Si quieres event sourcing en producción hoy, usa algo maduro: la API de aquí es inestable y se ha movido en cada versión. Si lo que quieres es **aprender** cómo encajan un agregado con event sourcing, un upcaster y una estrategia de snapshots en NestJS, el ejemplo ahora funciona de principio a fin y dos scripts lo demuestran — `npm run verify:mongo` y `npm run verify:sample`, ambos contra un MongoDB desechable de verdad.

## Qué hace

```bash
npm install @nestjslatam/ddd-es-lib @nestjslatam/ddd-lib
```

|                        |                                                                         |
| ---------------------- | ----------------------------------------------------------------------- |
| **Event store**        | Persistencia sólo-añadir, MongoDB o tu propio driver                    |
| **Snapshots**          | Estrategias `EventCount`, `TimeBased` y `Composite`                     |
| **Upcasting**          | `VersionedEvent` + `EnhancedUpcasterRegistry` para evolución de esquema |
| **Rehidratación**      | `EnhancedAggregateRehydrator`, con snapshots automáticos                |
| **Sagas**              | `AbstractSaga`, `SagaRegistry`                                          |
| **Modelos de lectura** | `MaterializedViewManager`, estrategias de invalidación                  |
| **Rendimiento**        | `BatchedEventStorePublisher`, `ParallelEventProcessor`                  |

El `DddAggregateRoot` de `ddd-lib` es el agregado que reproduces; esta librería aporta todo lo que lo rodea.

## Ejecutar las pruebas

```bash
npm install
npm test        # 23 suites, 183 pruebas, ~5s
```

**No hace falta Docker ni MongoDB** — la batería corre entera en memoria. Es la forma más barata de ver funcionar los bloques de construcción, y es también la razón de que los defectos que hubo estuvieran en el cableado y no en las piezas.

## Limitaciones conocidas

Cada una se reprodujo ejecutándola.

**En la librería**

- **La API pública es inestable.** Se ha movido en todas las versiones hasta ahora. Clava exacto.
- **La batería no arranca el módulo.** 183 pruebas cubren los bloques de construcción; los cinco defectos del driver `mongo` y los del ejemplo fueron invisibles para ellas. Dos scripts lo arrancan contra un MongoDB desechable y **CI ejecuta los dos en cada push**: `npm run verify:mongo` para el driver, `npm run verify:sample` para la aplicación.

**En la aplicación de ejemplo**

- **El ejemplo funciona** desde la `1.5.0`: `npm run verify:sample` lo arranca contra un MongoDB desechable y ejercita la apertura, el depósito y la lectura proyectada. Los identificadores de cuenta deben ser UUID y ahora se rechazan en el borde con un `400` en lugar de en el fondo del agregado.

**En el repositorio**

- **El contenedor de PostgreSQL de `docker-compose.yml` sobra.** Nada en `src/` ni en `libs/` menciona Postgres, TypeORM ni el puerto 5432.
- **`docs/CI_CD_SETUP.md` nombra un `release.yml`** que no existe; el workflow de publicación es `cd.yml`.
- **El sitio de documentación generado dice que instales `@nestjslatam/es`**, que no es un paquete de npm.

## Preguntas frecuentes

<details>
<summary><b>Cuatro paquetes <code>@nestjslatam</code>, ¿cuál necesito?</b></summary>

[`ddd-lib`](https://github.com/nestjslatam/ddd) es el cimiento y siempre hace falta. **Este paquete es sólo para event sourcing**, y exige `mongoose` y `@nestjs/mongoose` como dependencias par aunque uses un driver propio. [`ddd-valueobjects`](https://github.com/nestjslatam/ddd-valueobjects) son value objects opcionales; [`ddd-cli`](https://github.com/nestjslatam/ddd-cli) es una herramienta de desarrollo.
</details>

<details>
<summary><b>¿Está listo para producción?</b></summary>

**Más cerca de lo que estaba, y la respuesta honesta ahora va de madurez y no de cosas rotas.** Los dos huecos de cableado están cerrados desde la `1.4.0`: los eventos confirmados llegan a tus proyectores y el driver `mongo` arranca.

Lo que queda es que la API pública es inestable y se ha movido en cada versión, y que la batería de 183 pruebas nunca arranca el módulo — cada uno de los cinco defectos que tenía el driver `mongo` fue invisible para ella. Clava una versión exacta, y ejecuta `npm run verify:mongo` si tocas el driver.

Conviene separarlo del cimiento sobre el que se apoya. `@nestjslatam/ddd-lib@4.0.0` es la primera versión con pruebas sobre las clases que extiendes — 1017 de ellas, 98,6 % de cobertura — y su riesgo restante es cambio de API, no corrección. **Ese progreso no ha ocurrido aquí.** Las 183 pruebas de este paquete cubren sus bloques de construcción, no el cableado entre ellos, que es justo donde viven sus defectos.
</details>

<details>
<summary><b>¿Necesito MongoDB para empezar?</b></summary>

Para las pruebas no — las 183 corren en memoria sin base de datos. La necesitas para ejecutar el ejemplo, y tiene que ser un **conjunto de réplicas**: las transacciones de MongoDB lo exigen, y el event store escribe el evento y la versión del agregado de forma atómica.

```bash
docker run -d -p 27017:27017 mongo:7 --replSet rs0
docker exec <id> mongosh --eval 'rs.initiate()'
```

</details>

<details>
<summary><b>Registré un <code>@EventsHandler</code> y <code>commit()</code> nunca lo llama.</b></summary>

**Arreglado — actualiza.** Hasta la `1.2.0`, `EventStorePublisher` **sustituía** al publicador del bus de eventos de CQRS en lugar de envolverlo, así que los eventos se guardaban y no se despachaban nunca. Ahora captura el publicador que desplaza y le pasa cada evento después de que la escritura tenga éxito.
</details>

<details>
<summary><b>Mi agregado reproducido vuelve con el id equivocado, o una segunda reproducción no devuelve nada.</b></summary>

Comprueba que el id sea un **UUID v4** — `IdValueObject.load` rechaza cualquier otra cosa, y las propias pruebas del ejemplo nunca ejercitan ese camino porque simulan el bus de comandos.
</details>

<details>
<summary><b>¿Qué me aporta frente a escribir yo el event store?</b></summary>

Las partes tediosas y fáciles de equivocar de forma sutil: el upcasting para la evolución del esquema, tres estrategias de snapshot componibles, y la orquestación de sagas. El núcleo de añadir y leer es la parte fácil; esas tres no lo son.
</details>

<details>
<summary><b>¿El CLI me andamia el código de event sourcing?</b></summary>

Todavía no. [`ddd-cli`](https://github.com/nestjslatam/ddd-cli) lee y andamia los estereotipos de `ddd-lib` — agregados, value objects, validadores. Los de event sourcing no están entre sus plantillas, lo que los convierte en una buena contribución para **aquel** repositorio.
</details>

<details>
<summary><b>¿Qué versiones de NestJS, Node y Mongoose?</b></summary>

NestJS 10 u 11, Node `>=20.11`, mongoose `^8 || ^9`, y `ddd-lib` `^2.0.0 || ^3.0.0 || ^4.0.0` — cada versión mayor nueva verificada volviendo a ejecutar la batería completa contra ella antes de ampliar el rango, lo que para la `4.0.0` significó empaquetar su tarball en local y probar contra él antes de que se publicara. Diez dependencias par en total, ninguna opcional; el manifiesto tiene los rangos exactos.
</details>

## Colaborar

Todo lo de abajo está diagnosticado, es reproducible y se resuelve por sí solo — la mejor clase de primera contribución.

1. **Borra el contenedor muerto de PostgreSQL** y arregla las dos referencias obsoletas de la documentación.
2. **Estereotipos de event sourcing para el CLI.** Agregados con event sourcing, upcasters y proyectores no están entre sus plantillas.
3. **Una segunda implementación de driver.** El contrato existe y sólo hay una implementación real; una segunda demostraría que la abstracción aguanta.

Antes de abrir un PR:

```bash
npm run lint && npm test
```

CI ejecuta lint, comprobación de tipos, la construcción, la batería en Node 18 y 20, y los dos scripts de verificación contra un MongoDB real. Los commits siguen [Conventional Commits](https://www.conventionalcommits.org/).

## Estructura del repositorio

|                                          |                                                            |
| ---------------------------------------- | ---------------------------------------------------------- |
| `libs/es/`                               | La librería publicada — esto es el producto                |
| `src/bank-account/`                      | Un ejemplo que funciona — `npm run verify:sample`          |
| [`libs/es/README.md`](libs/es/README.md) | El README que ve npm, con el catálogo completo de defectos |
| [`CHANGELOG.md`](CHANGELOG.md)           | Cada versión y su porqué                                   |

Publicación: `npm run build:lib` compila con `tsc` y deriva el manifiesto; el paquete se publica desde `dist/libs/es`.

> [!TIP]
> **[La guía completa del CLI →](https://github.com/nestjslatam/ddd-cli/blob/main/docs/GUIDE.md)** — cada comando y cada opción, recorridos construyendo un dominio completo desde cero hasta diez ficheros que compilan. Vale la pena aunque nunca instales el CLI: es la explicación más clara del idioma de esta librería que existe, porque cada afirmación se produjo ejecutando la herramienta.

## Quiénes están detrás

Construido y mantenido por **[BeyondNet Tech](https://beyondnet.info/)** junto a la comunidad [NestJS Latam](https://nestjslatam.dev/).

- **[Evolith](https://github.com/beyondnetcode/evolith_arch32)** — gobierno de arquitectura ejecutable: un CLI, un servidor MCP y una API REST que comprueban un repositorio contra reglas Rego/OPA, e informan de una regla que no pudieron evaluar como un fallo en lugar de dejarla pasar en silencio.
- **[Shell.ddd](https://github.com/beyondnetcode/Shell.ddd)** — la contraparte .NET de `ddd-lib`.

## Licencia

MIT — ver [LICENSE](LICENSE). La `1.1.0` y anteriores declaraban `Apache-2.0` en el manifiesto sobre este mismo fichero MIT; un manifiesto publicado no se puede enmendar en su sitio, así que actualiza en lugar de fiarte del campo de licencia de una versión antigua.

---

<div align="center">

**Impulsado por [BeyondNetCode](https://beyondnet.info/)**

[Web](https://beyondnet.info/) · [GitHub](https://github.com/beyondnetcode) · [NestJS Latam](https://nestjslatam.dev/)

</div>
