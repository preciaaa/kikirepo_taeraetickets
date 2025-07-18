import {
    NavigationMenu,
    NavigationMenuList,
    NavigationMenuItem,
    NavigationMenuTrigger,
    NavigationMenuContent,
    NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";

import Link from "next/link";


export default function Navbar() {
    const isLoggedIn = true; // Mock
    let authbutton;
    if (isLoggedIn) {
        authbutton = (
            <Link href="/profile">
                <Button variant="outline">My Profile</Button>
            </Link>
        );
    } else {
        authbutton = (
            <Link href="/auth/signup">
                <Button>Sign Up</Button>
            </Link>
        );
    }
    return (
        <nav className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-50 shadow-md">
            <Link href="/" className="flex items-center text-2xl font-bold">
                <img src="../../favicon.ico" alt="logo" className="w-7 h-8 mr-2" />
                taeraetickets
            </Link>

            <NavigationMenu>
                <NavigationMenuList>
                    <NavigationMenuItem>
                    <NavigationMenuLink href="/my-listings" className="rounded-full px-5">My Listings</NavigationMenuLink>
                    </NavigationMenuItem>
                        <NavigationMenuLink href="/events" className="rounded-full px-5">Events</NavigationMenuLink>
                    {/* Add more menu items here */}
                </NavigationMenuList>
            </NavigationMenu>
            <div>{authbutton}</div>
        </nav>
    );
}
