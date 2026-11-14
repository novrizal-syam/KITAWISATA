"use client";

import { startTransition, useActionState, type FormEvent } from "react";

/**
 * Like useActionState, but keeps what the user typed when the server answers with an error.
 * React 19 resets a <form action={...}> after every submission, which wiped fields on validation
 * errors. Submitting through onSubmit avoids that; the browser's own validation still runs first,
 * and the clicked button's name/value is kept (e.g. Approve vs Reject).
 */
export function useActionForm<S>(action: (state: Awaited<S>, form: FormData) => Promise<S>, initial: Awaited<S>) {
  const [state, dispatch, pending] = useActionState<S, FormData>(action, initial);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const data = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(data));
  };
  return [state, onSubmit, pending] as const;
}
