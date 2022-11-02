# spaceport-api
Spaceport application docking/undocking service backend

## startup application 

### prerequisites
- sturtup mongodb instance

### local run
- create and configure .env file in root of project(for example see: .env.example)
- in root of project run from terminal     
    ```sh
    npm install
    ```
- in root of project run from terminal
    ```sh
    npm run start:local
    ```

### docker run
- build docker image using Dockerfile
- specify env vars for container(list of required vars get from .env.example)
- start container

## License
MIT