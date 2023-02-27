export default class ThalerError extends Error {
  constructor(id: string) {
    super(`function "${id}" threw an unhandled server-side error.`);
  }
}
