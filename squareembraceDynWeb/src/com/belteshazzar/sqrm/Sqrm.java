package com.belteshazzar.sqrm;

import java.util.HashSet;
import java.util.Set;

import javax.ws.rs.ApplicationPath;

@ApplicationPath("/sqrm")
public class Sqrm extends javax.ws.rs.core.Application
{

	@Override
	public Set<Class<?>> getClasses()
	{
		Set<Class<?>> cs = new HashSet<Class<?>>();
		cs.add(SqrmPage.class);
		cs.add(SqrmRestSearch.class);
		cs.add(SqrmRestWiki.class);
		cs.add(SqrmRestUser.class);
		return cs;
	}
}
