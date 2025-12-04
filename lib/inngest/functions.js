import {inngest} from "@/lib/inngest/client";

export const helloworld=inngest.createFunction(
    {id:"hello-world"},
    {event:"test/hello.world"},
    async({event,step})=>{
        await step.sleep("wait-a-moment","ls")
        return {message:`Hello ${event.data.email}`}
    })