interface X {
	a: number[];
	b: {b1: string, b2: number};
}

type Y<A> =  {
	[K in keyof A]?: A[K] extends object ? Y<A[K]> : A[K] 
}

type Z = Y<X>

