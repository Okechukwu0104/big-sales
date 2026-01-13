import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Category } from '@/types';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
}

const buildCategoryTree = (categories: Category[]): CategoryWithChildren[] => {
  const categoryMap = new Map<string, CategoryWithChildren>();
  const roots: CategoryWithChildren[] = [];

  // First pass: create map of all categories
  categories.forEach(cat => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  // Second pass: build tree structure
  categories.forEach(cat => {
    const category = categoryMap.get(cat.id)!;
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      categoryMap.get(cat.parent_id)!.children!.push(category);
    } else {
      roots.push(category);
    }
  });

  // Sort by display_order
  const sortByOrder = (a: CategoryWithChildren, b: CategoryWithChildren) => 
    (a.display_order || 0) - (b.display_order || 0);
  
  roots.sort(sortByOrder);
  roots.forEach(root => root.children?.sort(sortByOrder));

  return roots;
};

// Desktop Mega Menu
const DesktopMegaMenu = ({ categories }: { categories: CategoryWithChildren[] }) => {
  return (
    <NavigationMenu className="hidden lg:flex">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-transparent">
            Categories
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid gap-3 p-6 w-[600px] lg:w-[800px] lg:grid-cols-3">
              {categories.map(category => (
                <div key={category.id} className="space-y-3">
                  <Link
                    to={`/category/${category.slug || category.id}`}
                    className="block font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {category.name}
                  </Link>
                  {category.children && category.children.length > 0 && (
                    <ul className="space-y-2">
                      {category.children.map(child => (
                        <li key={child.id}>
                          <Link
                            to={`/category/${child.slug || child.id}`}
                            className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              
              {categories.length === 0 && (
                <div className="col-span-3 text-center py-8 text-muted-foreground">
                  No categories yet
                </div>
              )}
            </div>
            
            <div className="border-t p-4 bg-muted/50">
              <Link 
                to="/bundles" 
                className="text-sm font-medium text-primary hover:underline"
              >
                View All Bundles →
              </Link>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        
        <NavigationMenuItem>
          <Link 
            to="/bundles"
            className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50"
          >
            Bundles
          </Link>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
};

// Mobile Menu
const MobileMenu = ({ categories }: { categories: CategoryWithChildren[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px]">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        
        <nav className="mt-6 space-y-2">
          <div className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">
            Categories
          </div>
          
          {categories.map(category => (
            <div key={category.id}>
              <div className="flex items-center">
                <Link
                  to={`/category/${category.slug || category.id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2 font-medium hover:text-primary transition-colors"
                >
                  {category.name}
                </Link>
                {category.children && category.children.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCategory(category.id)}
                  >
                    {expandedCategories.includes(category.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              
              {category.children && expandedCategories.includes(category.id) && (
                <div className="ml-4 space-y-1 border-l pl-4">
                  {category.children.map(child => (
                    <Link
                      key={child.id}
                      to={`/category/${child.slug || child.id}`}
                      onClick={() => setIsOpen(false)}
                      className="block py-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {categories.length === 0 && (
            <div className="text-sm text-muted-foreground py-4">
              No categories yet
            </div>
          )}

          <div className="border-t pt-4 mt-4">
            <Link
              to="/bundles"
              onClick={() => setIsOpen(false)}
              className="block py-2 font-medium hover:text-primary transition-colors"
            >
              🎁 Bundles & Deals
            </Link>
            <Link
              to="/wishlist"
              onClick={() => setIsOpen(false)}
              className="block py-2 font-medium hover:text-primary transition-colors"
            >
              ❤️ Wishlist
            </Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export const MegaMenu = () => {
  const { data: categories } = useQuery({
    queryKey: ['categories-menu'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Category[];
    },
  });

  const categoryTree = categories ? buildCategoryTree(categories) : [];

  return (
    <>
      <DesktopMegaMenu categories={categoryTree} />
      <MobileMenu categories={categoryTree} />
    </>
  );
};

export default MegaMenu;
