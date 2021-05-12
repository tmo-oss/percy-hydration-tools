
export class ParseError extends Error {
  messages: string[] = [];
  constructor(errors?: Error[]) {
    super("ParseError");
    this.name = "ParseError";
    if (errors) {
        for (const err of errors) {
            if (err instanceof ParseError) {
                this.messages.push(...err.messages);
            } else {
                this.messages.push(err.message);
            }
        }
    }
  }

  append(err: Error): void {
    if (err instanceof ParseError) {
        this.messages.push(...err.messages);
    } else {
        this.messages.push(err.message);
    }
  }
  appendPrefix(prefix: string): void {
    this.messages = this.messages.map(msg => `${prefix}${msg}`)
  }
}