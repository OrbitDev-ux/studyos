import { Writable } from "node:stream";
import type Docker from "dockerode";

export type ExecResult = { stdout: string; stderr: string; exitCode: number };

/** Runs a one-shot command inside a running container and captures its
 * output. Used by the filesystem, git, and process-manager routes — never
 * with unsanitized user input as the executable itself (callers pass a fixed
 * argv array; user data only ever appears as an ARGUMENT, never as `sh -c`
 * string interpolation, so shell metacharacters in e.g. a filename can't
 * break out of the command). */
export async function execCapture(
  docker: Docker,
  containerName: string,
  cmd: string[],
  opts?: { cwd?: string; input?: string; timeoutMs?: number },
): Promise<ExecResult> {
  const container = docker.getContainer(containerName);
  const exec = await container.exec({
    Cmd: cmd,
    AttachStdin: !!opts?.input,
    AttachStdout: true,
    AttachStderr: true,
    WorkingDir: opts?.cwd ?? "/workspace",
  });

  const stream = await exec.start({ hijack: true, stdin: !!opts?.input });

  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  const stdoutSink = new Writable({
    write(chunk, _enc, cb) {
      stdoutChunks.push(chunk);
      cb();
    },
  });
  const stderrSink = new Writable({
    write(chunk, _enc, cb) {
      stderrChunks.push(chunk);
      cb();
    },
  });
  docker.modem.demuxStream(stream, stdoutSink, stderrSink);

  if (opts?.input !== undefined) {
    stream.end(opts.input);
  }

  await new Promise<void>((resolve, reject) => {
    const timer = opts?.timeoutMs
      ? setTimeout(() => {
          stream.destroy();
          reject(new Error("exec timed out"));
        }, opts.timeoutMs)
      : null;
    stream.on("end", () => {
      if (timer) clearTimeout(timer);
      resolve();
    });
    stream.on("error", (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });
  });

  const info = await exec.inspect();
  return {
    stdout: Buffer.concat(stdoutChunks).toString("utf8"),
    stderr: Buffer.concat(stderrChunks).toString("utf8"),
    exitCode: info.ExitCode ?? -1,
  };
}
