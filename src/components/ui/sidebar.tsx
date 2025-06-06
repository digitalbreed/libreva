'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type SidebarProps = React.HTMLAttributes<HTMLDivElement>;

export function Sidebar({ className, ...props }: SidebarProps) {
	return (
		<div
			className={cn('flex h-screen w-[240px] flex-col border-r bg-background', className)}
			{...props}
		/>
	);
}

type SidebarHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export function SidebarHeader({ className, ...props }: SidebarHeaderProps) {
	return <div className={cn('flex h-14 items-center border-b px-4', className)} {...props} />;
}

type SidebarContentProps = React.HTMLAttributes<HTMLDivElement>;

export function SidebarContent({ className, ...props }: SidebarContentProps) {
	return <div className={cn('flex-1 overflow-auto py-4', className)} {...props} />;
}

type SidebarTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function SidebarTrigger({ className, ...props }: SidebarTriggerProps) {
	return (
		<button
			className={cn(
				'inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground',
				className
			)}
			{...props}
		/>
	);
}
